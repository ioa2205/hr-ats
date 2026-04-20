import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const PAGE_SIZE = 25;

type SortOption = "score" | "newest" | "oldest" | "name";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params;

  try {
    const access = await requireCompanyAccessApi();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const admin = createAdminClient();

    // Verify job belongs to the caller's company.
    const { data: job } = await admin
      .from("job_postings")
      .select("id")
      .eq("id", jobId)
      .eq("company_id", access.companyId)
      .maybeSingle();

    if (!job) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const sort = (url.searchParams.get("sort") ?? "score") as SortOption;
    const statusFilter = url.searchParams.getAll("status");
    const scoreMin = url.searchParams.get("scoreMin");
    const scoreMax = url.searchParams.get("scoreMax");
    const dateFrom = url.searchParams.get("dateFrom");
    const dateTo = url.searchParams.get("dateTo");

    // ── Counts (aggregated in one query) ─────────────────────────────
    const { data: allCandidates } = await admin
      .from("candidates")
      .select("status")
      .eq("job_posting_id", jobId);

    const counts = {
      total: 0,
      analyzed: 0,
      pending: 0,
      failed: 0,
      screened_out: 0,
      invited: 0,
    };

    if (allCandidates) {
      for (const c of allCandidates) {
        if (c.status !== "rejected_screening") {
          counts.total++;
        }
        if (c.status === "analyzed") counts.analyzed++;
        if (c.status === "pending_analysis" || c.status === "analyzing") counts.pending++;
        if (c.status === "analysis_failed") counts.failed++;
        if (c.status === "rejected_screening") counts.screened_out++;
        if (c.status === "invited") counts.invited++;
      }
    }

    // ── Main query with ranking ──────────────────────────────────────
    let query = admin
      .from("candidates")
      .select("*", { count: "exact" })
      .eq("job_posting_id", jobId)
      .neq("status", "rejected_screening");

    // Filters
    if (statusFilter.length > 0) {
      query = query.in("status", statusFilter);
    }
    if (scoreMin) {
      query = query.gte("match_score", parseInt(scoreMin, 10));
    }
    if (scoreMax) {
      query = query.lte("match_score", parseInt(scoreMax, 10));
    }
    if (dateFrom) {
      query = query.gte("created_at", dateFrom);
    }
    if (dateTo) {
      query = query.lte("created_at", dateTo);
    }

    // Sort
    switch (sort) {
      case "score":
        query = query.order("match_score", { ascending: false, nullsFirst: false });
        break;
      case "newest":
        query = query.order("created_at", { ascending: false });
        break;
      case "oldest":
        query = query.order("created_at", { ascending: true });
        break;
      case "name":
        query = query.order("full_name", { ascending: true });
        break;
    }

    // Pagination
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    query = query.range(from, to);

    const { data: candidates, count, error } = await query;

    if (error) {
      logger.error({ context: "applicants", err: error, jobId }, "Failed to fetch candidates");
      return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
    }

    // ── Screened out candidates (separate query) ─────────────────────
    const { data: screenedOut } = await admin
      .from("candidates")
      .select("id, full_name, created_at, status")
      .eq("job_posting_id", jobId)
      .eq("status", "rejected_screening")
      .order("created_at", { ascending: false });

    return NextResponse.json({
      candidates: candidates ?? [],
      screenedOut: screenedOut ?? [],
      counts,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
      },
    });
  } catch (err) {
    logger.error({ context: "applicants", err, jobId }, "Unhandled error in applicants endpoint");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
