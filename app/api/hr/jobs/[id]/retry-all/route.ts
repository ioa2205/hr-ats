import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_CAP = 50;
const SPACING_MS = 300;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params;

  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const admin = createAdminClient();

    // Verify the job belongs to the caller's company.
    const { data: job } = await admin
      .from("job_postings")
      .select("id")
      .eq("id", jobId)
      .eq("company_id", access.companyId)
      .maybeSingle();

    if (!job) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // ── Select failed candidates under retry cap ──────────────────────
    const { data: candidates, error: fetchError } = await admin
      .from("candidates")
      .select("id")
      .eq("job_posting_id", jobId)
      .eq("status", "analysis_failed")
      .lt("retry_count", 3)
      .limit(BATCH_CAP);

    if (fetchError) {
      logger.error({ context: "retry-all", err: fetchError, jobId }, "Failed to fetch candidates");
      return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
    }

    if (!candidates || candidates.length === 0) {
      return NextResponse.json({ queued: 0 });
    }

    // ── Reset all to pending ──────────────────────────────────────────
    const ids = candidates.map((c) => c.id);
    await admin
      .from("candidates")
      .update({ status: "pending_analysis", ai_error: null })
      .in("id", ids);

    // ── Invoke process-cv with spacing to avoid rate limits ───────────
    let queued = 0;
    for (const candidate of candidates) {
      try {
        await admin.functions.invoke("process-cv", {
          body: { candidateId: candidate.id },
        });
        queued++;
      } catch (err) {
        logger.error(
          { context: "retry-all", err, candidateId: candidate.id },
          "process-cv invocation failed",
        );
      }
      if (queued < candidates.length) {
        await new Promise((r) => setTimeout(r, SPACING_MS));
      }
    }

    return NextResponse.json({ queued });
  } catch (err) {
    logger.error({ context: "retry-all", err, jobId }, "Unhandled error in retry-all endpoint");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
