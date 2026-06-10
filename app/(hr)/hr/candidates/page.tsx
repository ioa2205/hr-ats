export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight, Search, Users } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import {
  AIFitScore,
  AnalysisStatus,
  Avatar,
  Badge,
  Button,
  EmptyState,
  Panel,
} from "@/components/ui";
import { CandidateStatusBadge } from "@/components/hr/applicants/candidate-status-badge";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { pageBounds } from "@/lib/pagination";
import type { Locale } from "@/lib/i18n/types";
import {
  candidateMatchesFilter,
  candidateVerdict,
  parseCandidateFilter,
  parseCandidateSort,
  type CandidateFilter,
  type CandidateSort,
} from "@/lib/applicants/presentation";
import type { CandidateStatus } from "@/types";

const PAGE_SIZE = 50;

function relativeTime(iso: string, locale: Locale): string {
  const date = new Date(iso);
  const diffMin = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMin < 1) return t("hr.time.now", locale);
  if (diffMin < 60) return t("hr.time.m_ago", locale, { n: String(diffMin) });
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return t("hr.time.h_ago", locale, { n: String(hours) });
  return t("hr.time.days_ago", locale, { days: String(Math.floor(hours / 24)) });
}

function analysisStatus(status: CandidateStatus) {
  if (status === "analysis_failed") return "failed" as const;
  if (status === "analyzing") return "processing" as const;
  if (status === "pending_analysis" || status === "unscored") return "queued" as const;
  return "complete" as const;
}

function analysisStatusLabel(status: CandidateStatus, locale: Locale) {
  if (status === "analysis_failed") return t("applicants.analysis.status_failed", locale);
  if (status === "analyzing") return t("applicants.analysis.status_processing", locale);
  if (status === "pending_analysis" || status === "unscored") {
    return t("applicants.analysis.status_waiting", locale);
  }
  return t("applicants.analysis.status_ready", locale);
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const filter = parseCandidateFilter(typeof sp.filter === "string" ? sp.filter : undefined);
  const sort = parseCandidateSort(typeof sp.sort === "string" ? sp.sort : undefined);
  const query = typeof sp.q === "string" ? sp.q.trim() : "";
  const selectedJob = typeof sp.job === "string" ? sp.job : "all";

  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const admin = createAdminClient();

  const { data: jobs } = await admin
    .from("job_postings")
    .select("id,title,title_ru,title_uz,title_en")
    .eq("company_id", companyId);
  const jobIds = (jobs ?? []).map((job) => job.id);
  const jobTitleById = Object.fromEntries(
    (jobs ?? []).map((job) => [
      job.id,
      pickLocalized({ ru: job.title_ru, uz: job.title_uz, en: job.title_en }, locale, job.title),
    ]),
  );

  if (jobIds.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-[clamp(1.5rem,4vw,1.85rem)] font-bold tracking-[-0.02em] text-[var(--color-text)]">
          {t("hr.nav.candidates", locale)}
        </h1>
        <Panel>
          <EmptyState
            icon={<Users />}
            title={t("hr.dashboard.empty_jobs", locale)}
            action={
              <Button asChild>
                <Link href="/hr/jobs/new">{t("hr.jobs.create", locale)}</Link>
              </Button>
            }
          />
        </Panel>
      </div>
    );
  }

  const { data } = await admin
    .from("candidates")
    .select(
      "id,full_name,match_score,status,job_posting_id,one_line_summary,one_line_summary_uz,one_line_summary_en,created_at,invited_at",
    )
    .in("job_posting_id", jobIds);
  const rows = data ?? [];
  const counts = {
    all: rows.length,
    new: 0,
    recommend: 0,
    review: 0,
    reject: 0,
    mismatch: 0,
  };
  for (const candidate of rows) {
    if (candidate.status === "pending_analysis" || candidate.status === "analyzing") counts.new++;
    const verdict = candidateVerdict(candidate);
    if (verdict !== "none") counts[verdict]++;
  }

  const normalizedQuery = query.toLocaleLowerCase(locale);
  const filtered = rows
    .filter((candidate) => candidateMatchesFilter(candidate, filter))
    .filter((candidate) => selectedJob === "all" || candidate.job_posting_id === selectedJob)
    .filter((candidate) => {
      if (!normalizedQuery) return true;
      const evidence = pickLocalized(
        {
          ru: candidate.one_line_summary,
          uz: candidate.one_line_summary_uz,
          en: candidate.one_line_summary_en,
        },
        locale,
        candidate.one_line_summary ?? "",
      );
      return `${candidate.full_name} ${evidence}`.toLocaleLowerCase(locale).includes(normalizedQuery);
    })
    .sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === "name") return a.full_name.localeCompare(b.full_name, locale);
      return (b.match_score ?? -1) - (a.match_score ?? -1);
    });

  const { page, totalPages, from, to } = pageBounds(
    filtered.length,
    typeof sp.page === "string" ? sp.page : undefined,
    PAGE_SIZE,
  );
  const pageRows = filtered.slice(from, to + 1);
  const filters: CandidateFilter[] = [
    "all",
    "new",
    "recommend",
    "review",
    "mismatch",
    "reject",
  ];
  const returnTo = candidatesHref({ filter, query, job: selectedJob, sort, page });
  const filterLabel = (value: CandidateFilter) => {
    if (value === "all") return t("hr.applicants.chip.all", locale);
    if (value === "new") return t("hr.applicants.chip.new", locale);
    if (value === "recommend") return t("hr.applicants.chip.top_picks", locale);
    if (value === "review") return t("hr.applicants.chip.review", locale);
    if (value === "mismatch") return t("hr.applicants.chip.below_requirements", locale);
    return t("hr.applicants.chip.below_bar", locale);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="data-mono mb-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
            {t("hr.candidates.eyebrow", locale, {
              total: String(counts.all),
              top: String(counts.recommend),
            })}
          </p>
          <h1 className="text-[clamp(1.5rem,4vw,1.85rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
            {t("hr.nav.candidates", locale)}
          </h1>
        </div>

        <form className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_auto_auto_auto]" method="get">
          <label className="flex h-10 min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3">
            <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder={t("applicants.search_placeholder", locale)}
              aria-label={t("applicants.search_placeholder", locale)}
              className="min-w-0 flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
            />
          </label>
          <select
            name="job"
            defaultValue={selectedJob}
            aria-label={t("hr.candidates.filter_job", locale)}
            className="h-10 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
          >
            <option value="all">{t("hr.candidates.all_jobs", locale)}</option>
            {(jobs ?? []).map((job) => (
              <option key={job.id} value={job.id}>
                {jobTitleById[job.id]}
              </option>
            ))}
          </select>
          <select
            name="sort"
            defaultValue={sort}
            aria-label={t("applicants.sort.label", locale)}
            className="h-10 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
          >
            <option value="score">{t("applicants.sort.score", locale)}</option>
            <option value="newest">{t("applicants.sort.newest", locale)}</option>
            <option value="oldest">{t("applicants.sort.oldest", locale)}</option>
            <option value="name">{t("applicants.sort.name", locale)}</option>
          </select>
          <Button type="submit">{t("applicants.search_action", locale)}</Button>
          {filter !== "all" && <input type="hidden" name="filter" value={filter} />}
        </form>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {filters.map((value) => (
          <Link
            key={value}
            href={candidatesHref({ filter: value, query, job: selectedJob, sort })}
            aria-current={filter === value ? "page" : undefined}
            className={
              filter === value
                ? "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--color-primary)] bg-[var(--color-primary-container)] px-3 text-sm font-medium text-[var(--color-on-primary-container)]"
                : "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-sm font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]"
            }
          >
            {filterLabel(value)}
            <span className="data-mono text-xs">{counts[value]}</span>
          </Link>
        ))}
      </div>

      {pageRows.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Search />}
            title={t("applicants.empty", locale)}
            description={t("applicants.search_empty", locale)}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link href="/hr/candidates">{t("common.clear", locale)}</Link>
              </Button>
            }
          />
        </Panel>
      ) : (
        <>
          <Panel className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)]">
                  <Th>{t("hr.candidates.column.candidate", locale)}</Th>
                  <Th>{t("hr.candidates.column.job", locale)}</Th>
                  <Th>{t("hr.candidates.column.ai_assessment", locale)}</Th>
                  <Th>{t("hr.candidates.column.status", locale)}</Th>
                  <Th>{t("hr.candidates.column.applied", locale)}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((candidate, index) => {
                  const evidence = pickLocalized(
                    {
                      ru: candidate.one_line_summary,
                      uz: candidate.one_line_summary_uz,
                      en: candidate.one_line_summary_en,
                    },
                    locale,
                    candidate.one_line_summary ?? t("applicants.analysis.no_data", locale),
                  );
                  return (
                    <tr
                      key={candidate.id}
                      className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-surface-subtle)]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={candidateHref(candidate.job_posting_id, candidate.id, returnTo)}
                          className="flex min-w-[240px] items-center gap-3"
                        >
                          <span className="data-mono w-7 text-[11px] text-[var(--color-text-subtle)]">
                            {String(from + index + 1).padStart(2, "0")}
                          </span>
                          <Avatar
                            name={candidate.full_name}
                            accent={candidateVerdict(candidate) === "recommend" && from + index < 3}
                          />
                          <span className="min-w-0">
                            <span className="block truncate font-bold text-[var(--color-text)]">
                              {candidate.full_name}
                            </span>
                            <span className="mt-0.5 line-clamp-1 block max-w-[360px] text-xs text-[var(--color-text-muted)]">
                              {evidence}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-text-muted)]">
                        {jobTitleById[candidate.job_posting_id] ?? "-"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1.5">
                          {candidate.match_score != null ? (
                            <AIFitScore
                              score={candidate.match_score}
                              label={t("applicants.analysis.ai_fit_score", locale)}
                              variant="compact"
                            />
                          ) : (
                            <span className="text-[var(--color-text-subtle)]">-</span>
                          )}
                          <AnalysisStatus
                            status={analysisStatus(candidate.status)}
                            label={analysisStatusLabel(candidate.status, locale)}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <CandidateStatusBadge status={candidate.status} />
                      </td>
                      <td className="data-mono px-4 py-3 text-xs text-[var(--color-text-subtle)]">
                        {relativeTime(candidate.created_at, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <ChevronRight className="h-4 w-4 text-[var(--color-text-subtle)]" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Panel>

          <ul className="flex flex-col gap-2.5 md:hidden">
            {pageRows.map((candidate) => {
              const evidence = pickLocalized(
                {
                  ru: candidate.one_line_summary,
                  uz: candidate.one_line_summary_uz,
                  en: candidate.one_line_summary_en,
                },
                locale,
                candidate.one_line_summary ?? t("applicants.analysis.no_data", locale),
              );
              return (
                <li key={candidate.id}>
                  <Link
                    href={candidateHref(candidate.job_posting_id, candidate.id, returnTo)}
                    className="block rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 hover:bg-[var(--color-surface-subtle)]"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={candidate.full_name} accent={candidateVerdict(candidate) === "recommend"} />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-[var(--color-text)]">{candidate.full_name}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">
                          {evidence}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {candidate.match_score != null && (
                        <AIFitScore
                          score={candidate.match_score}
                          label={t("applicants.analysis.ai_fit_score", locale)}
                          variant="compact"
                        />
                      )}
                      <CandidateStatusBadge status={candidate.status} />
                      <Badge tone="neutral">{jobTitleById[candidate.job_posting_id] ?? "-"}</Badge>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="data-mono text-xs text-[var(--color-text-subtle)]">
            {t("common.page_of", locale, { page: String(page), total: String(totalPages) })}
          </span>
          <div className="flex gap-2">
            <PageLink
              href={candidatesHref({ filter, query, job: selectedJob, sort, page: page - 1 })}
              disabled={page <= 1}
              label={t("common.previous", locale)}
            />
            <PageLink
              href={candidatesHref({ filter, query, job: selectedJob, sort, page: page + 1 })}
              disabled={page >= totalPages}
              label={t("common.next", locale)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function candidatesHref({
  filter,
  query,
  job,
  sort,
  page,
}: {
  filter: CandidateFilter;
  query: string;
  job: string;
  sort: CandidateSort;
  page?: number;
}) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (query) params.set("q", query);
  if (job !== "all") params.set("job", job);
  if (sort !== "score") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  const value = params.toString();
  return value ? `/hr/candidates?${value}` : "/hr/candidates";
}

function candidateHref(jobId: string, candidateId: string, returnTo: string) {
  const params = new URLSearchParams({
    candidate: candidateId,
    view: "full",
    returnTo,
  });
  return `/hr/jobs/${jobId}/applicants?${params.toString()}`;
}

function PageLink({ href, disabled, label }: { href: string; disabled: boolean; label: string }) {
  if (disabled) {
    return (
      <span className="inline-flex h-10 cursor-not-allowed items-center rounded-[var(--radius-md)] border border-[var(--color-line)] px-3 text-sm text-[var(--color-text-subtle)] opacity-50">
        {label}
      </span>
    );
  }
  return (
    <Button asChild variant="secondary" size="sm">
      <Link href={href} prefetch={false}>
        {label}
      </Link>
    </Button>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-semibold text-[var(--color-text-muted)]">
      {children}
    </th>
  );
}
