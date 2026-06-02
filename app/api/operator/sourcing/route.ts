import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import { summarizeRuns, type RunCostLike } from "@/lib/sourcing/summary";
import type { SourcingStatus } from "@/lib/sourcing/types";

const STATUS_FILTERS: SourcingStatus[] = [
  "queued",
  "running",
  "completed",
  "partial",
  "failed",
];

/**
 * Operator-wide sourcing activity + AI spend (Phase 4 polish). Cross-tenant by
 * design (operator surface), so it uses the admin client and is gated by
 * requireOperatorApi. Returns the recent runs plus a rolled-up summary the page
 * renders as headline tiles.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireOperatorApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const admin = createAdminClient();
    let query = admin
      .from("sourcing_searches")
      .select(
        "id, created_at, completed_at, status, sources, stats, input_tokens, output_tokens, cost_usd, error, job_posting:job_postings(title, company:companies(name))",
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (status && (STATUS_FILTERS as string[]).includes(status)) {
      query = query.eq("status", status as SourcingStatus);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ err: error }, "[api/operator/sourcing] fetch failed");
      return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }

    const rows = data ?? [];
    // Summary is over the (filtered) rows shown — honest about what's on screen.
    const summary = summarizeRuns(rows as unknown as RunCostLike[]);

    return NextResponse.json({ rows, summary });
  } catch (err) {
    logger.error({ err }, "[api/operator/sourcing] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
