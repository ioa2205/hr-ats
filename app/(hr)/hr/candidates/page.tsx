export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import {
  Panel,
  Avatar,
  ScoreMini,
  VerdictPill,
  Chip,
} from "@/components/hr/design";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { pageBounds } from "@/lib/pagination";
import type { Locale } from "@/lib/i18n/types";

type VerdictFilter = "all" | "new" | "recommend" | "review" | "reject";

const PAGE_SIZE = 50;

function verdictOf(status: string, score: number | null): "recommend" | "review" | "reject" | "none" {
  if (status === "rejected_screening") return "reject";
  const s = score ?? -1;
  if (s < 0) return "none";
  if (s >= 80 && (status === "analyzed" || status === "invited")) return "recommend";
  if (s >= 60 && s < 80) return "review";
  if (s < 60 && status === "analyzed") return "reject";
  return "none";
}

function relativeTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMin = Math.floor((now - d.getTime()) / 60000);
  if (diffMin < 1) return t("hr.time.now", locale);
  if (diffMin < 60) return t("hr.time.m_ago", locale, { n: String(diffMin) });
  const hrs = Math.floor(diffMin / 60);
  if (hrs < 24) return t("hr.time.h_ago", locale, { n: String(hrs) });
  const days = Math.floor(hrs / 24);
  return t("hr.time.days_ago", locale, { days: String(days) });
}

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const rawFilter = typeof sp.filter === "string" ? sp.filter : "all";
  const filter: VerdictFilter =
    rawFilter === "new" ||
    rawFilter === "recommend" ||
    rawFilter === "review" ||
    rawFilter === "reject"
      ? rawFilter
      : "all";

  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const admin = createAdminClient();

  const { data: jobs } = await admin
    .from("job_postings")
    .select("id,title,title_ru,title_uz,title_en")
    .eq("company_id", companyId);
  const jobIds = (jobs ?? []).map((j) => j.id);
  const jobTitleById = Object.fromEntries(
    (jobs ?? []).map((j) => [
      j.id,
      pickLocalized({ ru: j.title_ru, uz: j.title_uz, en: j.title_en }, locale, j.title),
    ]),
  );

  if (jobIds.length === 0) {
    return (
      <div>
        <h1 className="text-ink mb-6 text-[28px] font-semibold leading-[1.1] tracking-[-0.018em]">
          {t("hr.nav.candidates", locale)}.
        </h1>
        <Panel>
          <div className="text-ink-5 px-6 py-12 text-center text-[13px]">
            {t("hr.dashboard.empty_jobs", locale)}
          </div>
        </Panel>
      </div>
    );
  }

  // Lightweight full-set fetch (3 tiny columns) drives accurate chip counts AND
  // verdict filtering across ALL candidates, uncapped — so pagination never
  // hides older rows or skews the counts. Full detail is fetched only for the
  // current page below. Ordering matches idx_candidates_job_match.
  const { data: lite } = await admin
    .from("candidates")
    .select("id,status,match_score")
    .in("job_posting_id", jobIds)
    .order("match_score", { ascending: false, nullsFirst: false });
  const liteRows = lite ?? [];

  const counts = {
    all: liteRows.length,
    new: 0,
    recommend: 0,
    review: 0,
    reject: 0,
  };
  for (const c of liteRows) {
    if (c.status === "pending_analysis" || c.status === "analyzing") counts.new++;
    const v = verdictOf(c.status, c.match_score);
    if (v === "recommend") counts.recommend++;
    else if (v === "review") counts.review++;
    else if (v === "reject") counts.reject++;
  }

  const matchesFilter = (status: string, score: number | null) => {
    if (filter === "all") return true;
    if (filter === "new") return status === "pending_analysis" || status === "analyzing";
    return verdictOf(status, score) === filter;
  };

  const filteredIds = liteRows.filter((c) => matchesFilter(c.status, c.match_score)).map((c) => c.id);
  const { page, totalPages, from, to } = pageBounds(
    filteredIds.length,
    typeof sp.page === "string" ? sp.page : undefined,
    PAGE_SIZE,
  );
  const pageIds = filteredIds.slice(from, to + 1);

  const pageRows =
    (pageIds.length > 0
      ? (
          await admin
            .from("candidates")
            .select(
              "id,full_name,match_score,status,job_posting_id,one_line_summary,one_line_summary_uz,one_line_summary_en,created_at,invited_at",
            )
            .in("id", pageIds)
        ).data
      : []) ?? [];

  // .in() does not preserve order — restore the match_score ranking via pageIds.
  const byId = new Map(pageRows.map((r) => [r.id, r]));
  const filtered = pageIds.flatMap((id) => {
    const row = byId.get(id);
    return row ? [row] : [];
  });
  const pageStartIndex = (page - 1) * PAGE_SIZE;

  const chips: { value: VerdictFilter; labelKey: keyof typeof counts; count: number }[] = [
    { value: "all", labelKey: "all", count: counts.all },
    { value: "new", labelKey: "new", count: counts.new },
    { value: "recommend", labelKey: "recommend", count: counts.recommend },
    { value: "review", labelKey: "review", count: counts.review },
    { value: "reject", labelKey: "reject", count: counts.reject },
  ];

  const chipLabel = (v: VerdictFilter) => {
    switch (v) {
      case "all":
        return t("hr.applicants.chip.all", locale);
      case "new":
        return t("hr.applicants.chip.new", locale);
      case "recommend":
        return t("hr.applicants.chip.top_picks", locale);
      case "review":
        return t("hr.applicants.chip.review", locale);
      case "reject":
        return t("hr.applicants.chip.below_bar", locale);
    }
  };

  return (
    <div>
      <div className="text-ink-5 mb-1.5 flex items-center gap-1.5 text-[11px] font-medium">
        {t("hr.candidates.eyebrow", locale, {
          total: String(counts.all),
          top: String(counts.recommend),
        })}
      </div>
      <h1 className="text-ink mb-4 text-[28px] font-semibold leading-[1.1] tracking-[-0.018em]">
        {t("hr.nav.candidates", locale)}.
      </h1>

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <Link
            key={c.value}
            href={c.value === "all" ? "/hr/candidates" : `/hr/candidates?filter=${c.value}`}
            prefetch={false}
          >
            <Chip active={filter === c.value} count={c.count}>
              {chipLabel(c.value)}
            </Chip>
          </Link>
        ))}
      </div>

      <Panel>
        {filtered.length === 0 ? (
          <div className="text-ink-5 px-6 py-12 text-center text-[13px]">
            {t("applicants.empty", locale)}
          </div>
        ) : (
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                <Th style={{ width: 44 }}>#</Th>
                <Th>{t("hr.candidates.column.candidate", locale)}</Th>
                <Th>{t("hr.candidates.column.job", locale)}</Th>
                <Th>{t("hr.candidates.column.verdict", locale)}</Th>
                <Th align="right">{t("hr.candidates.column.score", locale)}</Th>
                <Th>{t("hr.candidates.column.applied", locale)}</Th>
                <Th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => {
                const rank = pageStartIndex + i;
                const v = verdictOf(c.status, c.match_score);
                const isNew = c.status === "pending_analysis" || c.status === "analyzing";
                return (
                  <tr
                    key={c.id}
                    className="border-rule hover:bg-bone cursor-pointer border-t transition-colors first:border-t-0"
                  >
                    <td
                      className="text-ink-5 px-3.5 py-2 text-[11px]"
                      style={{ fontFamily: "var(--font-tez-mono)" }}
                    >
                      {String(rank + 1).padStart(2, "0")}
                    </td>
                    <td className="px-3.5 py-2">
                      <Link
                        href={`/hr/jobs/${c.job_posting_id}/applicants?candidate=${c.id}`}
                        className="flex items-center gap-2.5"
                      >
                        <Avatar name={c.full_name} persimmon={v === "recommend" && rank < 3} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-ink text-[12.5px] font-semibold">
                              {c.full_name}
                            </span>
                            {isNew && (
                              <span
                                className="bg-persimmon h-[5px] w-[5px] rounded-full"
                                aria-hidden
                              />
                            )}
                          </div>
                          <div className="text-ink-4 text-[11px]">
                            {pickLocalized(
                              {
                                ru: c.one_line_summary,
                                uz: c.one_line_summary_uz,
                                en: c.one_line_summary_en,
                              },
                              locale,
                              c.one_line_summary ?? "—",
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="text-ink-3 px-3.5 py-2 text-[12px]">
                      {jobTitleById[c.job_posting_id] ?? "—"}
                    </td>
                    <td className="px-3.5 py-2">
                      {v === "none" ? (
                        <span className="text-ink-5">—</span>
                      ) : (
                        <VerdictPill
                          verdict={v}
                          labels={{
                            recommend: t("hr.applicants.verdict.recommend", locale),
                            review: t("hr.applicants.verdict.review", locale),
                            reject: t("hr.applicants.verdict.reject", locale),
                          }}
                        />
                      )}
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      {c.match_score != null ? (
                        <ScoreMini score={c.match_score} persimmon={v === "recommend"} />
                      ) : (
                        <span className="text-ink-5">—</span>
                      )}
                    </td>
                    <td
                      className="text-ink-5 px-3.5 py-2 text-[11px]"
                      style={{ fontFamily: "var(--font-tez-mono)" }}
                    >
                      {relativeTime(c.created_at, locale)}
                    </td>
                    <td className="px-3.5 py-2 text-right">
                      <ChevronRight className="text-ink-5 inline h-3.5 w-3.5" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      {totalPages > 1 && (
        <div className="mt-3.5 flex items-center justify-between text-[12px]">
          <span className="text-ink-5">
            {t("common.page_of", locale, { page: String(page), total: String(totalPages) })}
          </span>
          <div className="flex items-center gap-2">
            <PageLink
              href={candidatesHref(filter, page - 1)}
              disabled={page <= 1}
              label={t("common.previous", locale)}
            />
            <PageLink
              href={candidatesHref(filter, page + 1)}
              disabled={page >= totalPages}
              label={t("common.next", locale)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function candidatesHref(filter: VerdictFilter, page: number): string {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/hr/candidates?${qs}` : "/hr/candidates";
}

function PageLink({
  href,
  disabled,
  label,
}: {
  href: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="border-rule text-ink-5 cursor-not-allowed rounded-[4px] border px-2.5 py-1 opacity-50">
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      prefetch={false}
      className="border-rule text-ink-3 hover:bg-bone-2 rounded-[4px] border px-2.5 py-1"
    >
      {label}
    </Link>
  );
}

function Th({
  children,
  align,
  style,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  style?: React.CSSProperties;
}) {
  return (
    <th
      style={{ textAlign: align ?? "left", ...style }}
      className="text-ink-4 bg-bone border-rule border-b px-3.5 py-2 text-[10.5px] font-semibold"
    >
      {children}
    </th>
  );
}
