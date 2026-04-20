import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { incrementCvQuota } from "@/lib/companies/quota";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { logger } from "@/lib/logger";
import type { HardRequirement } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_CV_SIZE = 5 * 1024 * 1024; // 5MB
const PDF_MAGIC = "%PDF-";

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  try {
    const formData = await req.formData();

    const token = formData.get("token") as string | null;
    const fullName = formData.get("full_name") as string | null;
    const phoneNumber = formData.get("phone_number") as string | null;
    const cv = formData.get("cv") as File | null;
    const turnstileToken = formData.get("turnstile_token") as string | null;
    const formLoadedAt = formData.get("form_loaded_at") as string | null;
    const website = formData.get("website") as string | null;
    const requirementAnswersRaw = formData.get("requirement_answers") as string | null;

    // 1. Honeypot check — silently accept bots
    if (website) {
      return NextResponse.json({ success: true });
    }

    // 2. Timing defense — silently accept if too fast
    if (!formLoadedAt || Date.now() - Number(formLoadedAt) < 2000) {
      return NextResponse.json({ success: true });
    }

    // 3. Turnstile verification
    if (!turnstileToken) {
      return NextResponse.json({ error: "bot_check_failed" }, { status: 403 });
    }

    const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
    if (turnstileSecret) {
      const turnstileRes = await fetch(TURNSTILE_VERIFY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: turnstileSecret,
          response: turnstileToken,
          remoteip: ip,
        }),
      });
      const turnstileData = (await turnstileRes.json()) as { success: boolean };
      if (!turnstileData.success) {
        return NextResponse.json({ error: "bot_check_failed" }, { status: 403 });
      }
    }

    // 4. Basic field validation
    if (!token || !fullName?.trim() || !phoneNumber) {
      return NextResponse.json({ error: "missing_fields" }, { status: 400 });
    }

    if (!/^\+998\d{9}$/.test(phoneNumber)) {
      return NextResponse.json({ error: "invalid_phone" }, { status: 400 });
    }

    // 5. Rate limit
    const rl = await rateLimit({
      key: `apply:${ip}:${token}`,
      limit: 10,
      windowSeconds: 3600,
    });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "rate_limited" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rl.retryAfter ?? 60),
          },
        },
      );
    }

    // 6. Fetch job posting
    const supabase = createAdminClient();
    const { data: posting, error: postingError } = await supabase
      .from("job_postings")
      .select("id, company_id, hard_requirements, status")
      .eq("public_token", token)
      .single();

    if (postingError || !posting || posting.status === "closed") {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // 7. Validate requirement answers server-side
    const hardRequirements = (posting.hard_requirements ?? []) as HardRequirement[];
    let requirementAnswers: Record<string, string> = {};
    try {
      requirementAnswers = requirementAnswersRaw
        ? (JSON.parse(requirementAnswersRaw) as Record<string, string>)
        : {};
    } catch {
      return NextResponse.json({ error: "invalid_requirements" }, { status: 400 });
    }

    let requirementsFailed = false;
    for (const req of hardRequirements) {
      const val = requirementAnswers[req.id];
      if (req.type === "boolean" && val !== "true") {
        requirementsFailed = true;
        break;
      }
      if (req.type === "number") {
        const num = Number(val);
        if (!val || isNaN(num) || (req.min_value !== null && num < req.min_value)) {
          requirementsFailed = true;
          break;
        }
      }
    }

    if (requirementsFailed) {
      // Insert as rejected_screening — no CV upload, no AI
      await supabase.from("candidates").insert({
        job_posting_id: posting.id,
        full_name: fullName.trim(),
        phone_number: phoneNumber,
        status: "rejected_screening",
      });
      return NextResponse.json({ error: "requirements_failed" }, { status: 400 });
    }

    // 8. Validate file
    if (!cv) {
      return NextResponse.json({ error: "missing_file" }, { status: 400 });
    }

    if (cv.size > MAX_CV_SIZE) {
      return NextResponse.json({ error: "invalid_file" }, { status: 400 });
    }

    if (cv.type !== "application/pdf") {
      return NextResponse.json({ error: "invalid_file" }, { status: 400 });
    }

    // Magic bytes check
    const headerBytes = await cv.slice(0, 5).text();
    if (headerBytes !== PDF_MAGIC) {
      return NextResponse.json({ error: "invalid_file" }, { status: 400 });
    }

    // 9. Generate candidate and upload CV (path includes company_id for tenant isolation)
    const candidateId = crypto.randomUUID();
    const cvPath = `${posting.company_id}/${posting.id}/${candidateId}/cv.pdf`;

    const cvBuffer = Buffer.from(await cv.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from("cvs").upload(cvPath, cvBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (uploadError) {
      logger.error({ context: "apply", err: uploadError, ip }, "CV upload failed");
      return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }

    // 10. Quota gate — atomically reserve a CV slot. If the company is over
    // quota or its subscription is inactive, accept the candidate but skip
    // Gemini (cost control). The application is recorded for the HR to see.
    const consumed = await incrementCvQuota(posting.company_id);

    if (!consumed) {
      const { error: insertError } = await supabase.from("candidates").insert({
        id: candidateId,
        job_posting_id: posting.id,
        full_name: fullName.trim(),
        phone_number: phoneNumber,
        cv_storage_path: cvPath,
        status: "rejected_screening",
        ai_error: "quota_exceeded",
      });

      if (insertError) {
        logger.error(
          { context: "apply", err: insertError, ip, companyId: posting.company_id },
          "Candidate insert (quota_exceeded) failed",
        );
        return NextResponse.json({ error: "insert_failed" }, { status: 500 });
      }

      logger.info(
        { context: "apply", companyId: posting.company_id, candidateId },
        "Quota exceeded — candidate accepted without AI analysis",
      );

      return NextResponse.json({ success: true });
    }

    // 11. Insert candidate row
    const { error: insertError } = await supabase.from("candidates").insert({
      id: candidateId,
      job_posting_id: posting.id,
      full_name: fullName.trim(),
      phone_number: phoneNumber,
      cv_storage_path: cvPath,
      status: "pending_analysis",
    });

    if (insertError) {
      logger.error({ context: "apply", err: insertError, ip }, "Candidate insert failed");
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    // 12. Invoke Edge Function (fire-and-forget after response)
    after(async () => {
      try {
        await supabase.functions.invoke("process-cv", {
          body: { candidateId },
        });
      } catch (err) {
        logger.error({ context: "apply", err, candidateId }, "process-cv invocation failed");
      }

      try {
        await dispatchNotification({
          companyId: posting.company_id,
          event: "new_application",
          title: fullName.trim(),
          entityType: "candidate",
          entityId: candidateId,
          metadata: { job_posting_id: posting.id },
        });
      } catch (err) {
        logger.error({ context: "apply", err, candidateId }, "notification dispatch failed");
      }
    });

    // 12. Success
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ context: "apply", err, ip }, "Unhandled error in apply API");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
