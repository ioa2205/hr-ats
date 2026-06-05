import { NextResponse, type NextRequest } from "next/server";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  HR_CANDIDATE_LIMIT,
  HR_JOB_LIMIT,
  hrSearchQuerySchema,
  sanitizeHrIlike,
  type HRSearchResponse,
} from "@/lib/hr/search-schema";

export async function GET(request: NextRequest) {
  const access = await requireCompanyAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const parsed = hrSearchQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }

  const q = sanitizeHrIlike(parsed.data.q);
  const like = `%${q}%`;
  const admin = createAdminClient();

  try {
    const companyJobsRes = await admin
      .from("job_postings")
      .select("id,title,title_ru,title_uz,title_en,status,created_at")
      .eq("company_id", access.companyId)
      .order("created_at", { ascending: false });

    if (companyJobsRes.error) throw companyJobsRes.error;

    const allJobs = companyJobsRes.data ?? [];
    const jobById = new Map(allJobs.map((job) => [job.id, job]));
    const jobIds = allJobs.map((job) => job.id);

    const matchedJobs = allJobs
      .filter((job) =>
        [job.title, job.title_ru, job.title_uz, job.title_en]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(parsed.data.q.toLowerCase())),
      )
      .slice(0, HR_JOB_LIMIT);

    const candidatesRes =
      jobIds.length > 0
        ? await admin
            .from("candidates")
            .select("id,full_name,status,match_score,job_posting_id,one_line_summary,created_at")
            .in("job_posting_id", jobIds)
            .ilike("full_name", like)
            .order("created_at", { ascending: false })
            .limit(HR_CANDIDATE_LIMIT)
        : { data: [], error: null };

    if (candidatesRes.error) throw candidatesRes.error;

    const body: HRSearchResponse = {
      jobs: matchedJobs.map((job) => ({
        id: job.id,
        title: job.title,
        titleRu: job.title_ru,
        titleUz: job.title_uz,
        titleEn: job.title_en,
        status: job.status,
        createdAt: job.created_at,
      })),
      candidates: (candidatesRes.data ?? []).map((candidate) => {
        const job = jobById.get(candidate.job_posting_id);
        return {
          id: candidate.id,
          fullName: candidate.full_name,
          status: candidate.status,
          matchScore: candidate.match_score,
          jobId: candidate.job_posting_id,
          jobTitle: job?.title ?? "",
          summary: candidate.one_line_summary,
          createdAt: candidate.created_at,
        };
      }),
    };

    return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    logger.error({ err }, "[api/hr/search] query failed");
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
