import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { unwrapEmbed } from "@/lib/supabase/embed";
import { incrementCvQuota } from "@/lib/companies/quota";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * Manually trigger AI analysis on a candidate that was auto-skipped because
 * they didn't meet the job's hard requirements. Consumes one CV quota slot.
 *
 * Counterpart to `/retry`: that endpoint resets a previously-failed analysis
 * (no quota touch); this one is for the first attempt on an unscored row.
 */
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params;

  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const admin = createAdminClient();
    const { data: candidate, error: fetchError } = await admin
      .from("candidates")
      .select("id, status, job_postings!inner(company_id)")
      .eq("id", candidateId)
      .maybeSingle();

    if (fetchError || !candidate) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const job = unwrapEmbed<{ company_id: string }>(candidate.job_postings);
    if (!job || job.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (candidate.status !== "unscored") {
      return NextResponse.json(
        { error: "invalid_status", current: candidate.status },
        { status: 400 },
      );
    }

    // Atomically reserve a quota slot before flipping state. If the company
    // is over quota / inactive, surface that as 429 so the HR UI can show the
    // existing quota-exceeded messaging.
    const consumed = await incrementCvQuota(job.company_id);
    if (!consumed) {
      return NextResponse.json({ error: "quota_exceeded" }, { status: 429 });
    }

    await admin
      .from("candidates")
      .update({ status: "pending_analysis", ai_error: null })
      .eq("id", candidateId);

    after(async () => {
      try {
        await admin.functions.invoke("process-cv", {
          body: { candidateId },
        });
      } catch (err) {
        logger.error(
          { context: "analyze-anyway", err, candidateId },
          "process-cv invocation failed",
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error(
      { context: "analyze-anyway", err, candidateId },
      "Unhandled error in analyze-anyway endpoint",
    );
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
