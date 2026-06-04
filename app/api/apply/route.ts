import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { incrementCvQuota, refundCvQuota } from "@/lib/companies/quota";
import { dispatchNotification } from "@/lib/notifications/dispatch";
import { logger } from "@/lib/logger";
import { validatePdfBuffer } from "@/lib/pdf/validate";
import { evaluateRequirements } from "@/lib/validations/requirements";
import type { HardRequirement } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_CV_SIZE = 5 * 1024 * 1024; // 5MB

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

    // 7. Parse + evaluate requirements (NEVER blocks submission anymore).
    //    A mismatch is a flag to skip auto-AI, not a rejection. The candidate
    //    always gets through; HR sees the gap with a red flag and can choose
    //    to "Analyze with AI anyway" later.
    const hardRequirements = (posting.hard_requirements ?? []) as HardRequirement[];
    let requirementAnswers: Record<string, string> = {};
    try {
      requirementAnswers = requirementAnswersRaw
        ? (JSON.parse(requirementAnswersRaw) as Record<string, string>)
        : {};
    } catch {
      return NextResponse.json({ error: "invalid_requirements" }, { status: 400 });
    }

    const evaluation = evaluateRequirements(hardRequirements, requirementAnswers);
    const meetsRequirementsValue: boolean | null =
      hardRequirements.length === 0 ? null : evaluation.meetsAll;

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

    // 9. Structural PDF validation (magic + %%EOF + /Root trailer reference).
    // Rejects polyglots disguised as PDFs.
    const cvBuffer = Buffer.from(await cv.arrayBuffer());
    const pdfCheck = validatePdfBuffer(cvBuffer);
    if (!pdfCheck.ok) {
      logger.info(
        { context: "apply", ip, reason: pdfCheck.reason },
        "Rejected non-PDF upload",
      );
      return NextResponse.json({ error: "invalid_file" }, { status: 400 });
    }

    // 10. Generate candidate id and upload CV (path includes company_id for tenant isolation)
    const candidateId = crypto.randomUUID();
    const cvPath = `${posting.company_id}/${posting.id}/${candidateId}/cv.pdf`;
    const { error: uploadError } = await supabase.storage.from("cvs").upload(cvPath, cvBuffer, {
      contentType: "application/pdf",
      upsert: true,
    });

    if (uploadError) {
      logger.error({ context: "apply", err: uploadError, ip }, "CV upload failed");
      return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }

    const baseFields = {
      id: candidateId,
      job_posting_id: posting.id,
      full_name: fullName.trim(),
      phone_number: phoneNumber,
      cv_storage_path: cvPath,
      requirements_responses: evaluation.responses,
      requirements_snapshot: hardRequirements,
      meets_requirements: meetsRequirementsValue,
    };

    // 11a. Mismatch path — store the candidate with status=unscored, do NOT
    //      consume CV quota, do NOT trigger AI. HR will see the red-flag row
    //      and can opt to run AI manually via /api/hr/candidates/[id]/analyze-anyway.
    if (meetsRequirementsValue === false) {
      const { error: insertError } = await supabase.from("candidates").insert({
        ...baseFields,
        status: "unscored",
      });

      if (insertError) {
        logger.error(
          { context: "apply", err: insertError, ip, candidateId },
          "Candidate insert (unscored) failed",
        );
        return NextResponse.json({ error: "insert_failed" }, { status: 500 });
      }

      after(async () => {
        try {
          await dispatchNotification({
            companyId: posting.company_id,
            event: "new_application",
            title: fullName.trim(),
            entityType: "candidate",
            entityId: candidateId,
            metadata: { job_posting_id: posting.id, meets_requirements: false },
          });
        } catch (err) {
          logger.error(
            { context: "apply", err, candidateId },
            "notification dispatch failed (unscored)",
          );
        }
      });

      return NextResponse.json({ success: true });
    }

    // 11b. Quota gate — atomically reserve a CV slot. If the company is over
    //      quota or its subscription is inactive, accept the candidate but
    //      skip Gemini (cost control). The application is recorded for HR.
    const consumed = await incrementCvQuota(posting.company_id);

    if (!consumed) {
      const { error: insertError } = await supabase.from("candidates").insert({
        ...baseFields,
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

    // 12. Insert candidate row — meets requirements + quota OK → AI runs
    const { error: insertError } = await supabase.from("candidates").insert({
      ...baseFields,
      status: "pending_analysis",
    });

    if (insertError) {
      // The slot was reserved (step 11b) but no candidate row exists — refund it
      // so a transient insert failure doesn't permanently burn a trial CV slot.
      await refundCvQuota(posting.company_id);
      logger.error({ context: "apply", err: insertError, ip }, "Candidate insert failed");
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    // 13. Invoke Edge Function (fire-and-forget after response)
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

    // 14. Success
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ context: "apply", err, ip }, "Unhandled error in apply API");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
