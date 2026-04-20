import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { unwrapEmbed } from "@/lib/supabase/embed";
import { canScheduleInterview } from "@/lib/companies/quota";
import { logger } from "@/lib/logger";
import { CreateInterviewRequestSchema } from "@/lib/interviews/validators";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params;

  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = CreateInterviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "validation_failed", issues: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const admin = createAdminClient();
    const { data: candidate } = await admin
      .from("candidates")
      .select("id, full_name, status, job_postings!inner(id, company_id)")
      .eq("id", candidateId)
      .maybeSingle();

    if (!candidate) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const job = unwrapEmbed<{ id: string; company_id: string }>(candidate.job_postings);
    if (!job || job.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const quota = await canScheduleInterview(access.companyId);
    if (!quota.allowed) {
      return NextResponse.json(
        { error: quota.reason ?? "quota_exceeded", used: quota.used, limit: quota.limit },
        { status: 402 },
      );
    }

    const { data: created, error: createErr } = await admin
      .from("interview_requests")
      .insert({
        company_id: access.companyId,
        candidate_id: candidateId,
        job_posting_id: job.id,
        created_by: access.user.id,
        duration_minutes: parsed.data.duration_minutes,
        location_kind: parsed.data.location_kind,
        location_detail: parsed.data.location_detail ?? null,
        hr_message: parsed.data.hr_message ?? null,
      })
      .select("id, public_token, expires_at")
      .single();

    if (createErr || !created) {
      logger.error(
        { context: "interview-create", err: createErr, candidateId },
        "Failed to create interview request",
      );
      return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }

    const slotsRows = parsed.data.slot_start_ats
      .slice()
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((iso, idx) => ({
        request_id: created.id,
        start_at: iso,
        position: idx,
      }));

    const { error: slotsErr } = await admin.from("interview_slots").insert(slotsRows);
    if (slotsErr) {
      await admin.from("interview_requests").delete().eq("id", created.id);
      logger.error(
        { context: "interview-create", err: slotsErr, candidateId },
        "Failed to create interview slots; rolled back",
      );
      return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }

    await admin.from("audit_log").insert({
      actor_user_id: access.user.id,
      company_id: access.companyId,
      actor: "hr",
      action: "interview.requested",
      entity_type: "interview_request",
      entity_id: created.id,
      metadata: {
        candidate_id: candidateId,
        slots: parsed.data.slot_start_ats.length,
      },
    });

    return NextResponse.json({
      ok: true,
      id: created.id,
      public_token: created.public_token,
      expires_at: created.expires_at,
    });
  } catch (err) {
    logger.error(
      { context: "interview-create", err, candidateId },
      "Unhandled error in interview create endpoint",
    );
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
