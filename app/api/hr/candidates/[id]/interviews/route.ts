import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import { CreateInterviewRequestSchema } from "@/lib/interviews/validators";

export const runtime = "nodejs";

interface BookInterviewResult {
  ok: boolean;
  id?: string;
  public_token?: string;
  expires_at?: string;
  error?: string;
  used?: number;
  limit?: number;
}

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

    // Look up the candidate's job to pass job_posting_id into the RPC. The RPC
    // also validates company ownership; this lookup just gives us a nice 404.
    const { data: candidateJoin } = await admin
      .from("candidates")
      .select("id, job_postings!inner(id, company_id)")
      .eq("id", candidateId)
      .maybeSingle();

    const jobRaw = (candidateJoin?.job_postings ?? null) as
      | { id: string; company_id: string }
      | { id: string; company_id: string }[]
      | null;
    const job = Array.isArray(jobRaw) ? (jobRaw[0] ?? null) : jobRaw;

    if (!candidateJoin || !job || job.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const slotsSorted = parsed.data.slot_start_ats
      .slice()
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const { data: rpcData, error: rpcErr } = await admin.rpc("book_interview_request", {
      p_company_id: access.companyId,
      p_candidate_id: candidateId,
      p_job_posting_id: job.id,
      p_created_by: access.user.id,
      p_duration_minutes: parsed.data.duration_minutes,
      p_location_kind: parsed.data.location_kind,
      p_location_detail: parsed.data.location_detail ?? null,
      p_hr_message: parsed.data.hr_message ?? null,
      p_slot_start_ats: slotsSorted,
    });

    if (rpcErr) {
      logger.error(
        { context: "interview-create", err: rpcErr, candidateId },
        "book_interview_request RPC failed",
      );
      return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }

    const result = rpcData as BookInterviewResult | null;
    if (!result) {
      return NextResponse.json({ error: "create_failed" }, { status: 500 });
    }

    if (!result.ok) {
      const errorCode = result.error ?? "unknown";
      const status =
        errorCode === "candidate_not_found" || errorCode === "job_not_found"
          ? 404
          : errorCode === "no_subscription" ||
              errorCode === "subscription_inactive" ||
              errorCode === "scheduling_quota_exceeded"
            ? 402
            : 400;
      return NextResponse.json(
        { error: errorCode, used: result.used, limit: result.limit },
        { status },
      );
    }

    await admin.from("audit_log").insert({
      actor_user_id: access.user.id,
      company_id: access.companyId,
      actor: "hr",
      action: "interview.requested",
      entity_type: "interview_request",
      entity_id: result.id,
      metadata: {
        candidate_id: candidateId,
        slots: slotsSorted.length,
      },
    });

    return NextResponse.json({
      ok: true,
      id: result.id,
      public_token: result.public_token,
      expires_at: result.expires_at,
    });
  } catch (err) {
    logger.error(
      { context: "interview-create", err, candidateId },
      "Unhandled error in interview create endpoint",
    );
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
