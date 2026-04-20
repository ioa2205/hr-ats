import { NextResponse, after } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { unwrapEmbed } from "@/lib/supabase/embed";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params;

  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // ── Fetch candidate ───────────────────────────────────────────────
    const admin = createAdminClient();
    const { data: candidate, error: fetchError } = await admin
      .from("candidates")
      .select("id, status, retry_count, job_postings!inner(company_id)")
      .eq("id", candidateId)
      .maybeSingle();

    if (fetchError || !candidate) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const job = unwrapEmbed<{ company_id: string }>(candidate.job_postings);
    if (!job || job.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (candidate.status !== "analysis_failed") {
      return NextResponse.json(
        { error: "invalid_status", current: candidate.status },
        { status: 400 },
      );
    }

    if (candidate.retry_count >= 3) {
      return NextResponse.json({ error: "max_retries_exceeded" }, { status: 400 });
    }

    // ── Reset to pending + invoke process-cv ──────────────────────────
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
          { context: "retry", err, candidateId },
          "process-cv invocation failed during retry",
        );
      }
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ context: "retry", err, candidateId }, "Unhandled error in retry endpoint");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
