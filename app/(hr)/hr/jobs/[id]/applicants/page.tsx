export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Link2, Download, MoreHorizontal } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { Badge, Button } from "@/components/ui";
import { ApplicantsClient } from "@/components/hr/applicants/applicants-client";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import type { Candidate } from "@/types";
import {
  parseCandidateFilter,
  parseCandidateSort,
  parseComparisonIds,
} from "@/lib/applicants/presentation";

const PAGE_SIZE = 25;

function computeDaysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

export default async function ApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const queryText = typeof sp.q === "string" ? sp.q.trim() : "";
  const filter = parseCandidateFilter(typeof sp.filter === "string" ? sp.filter : undefined);
  const sort = parseCandidateSort(typeof sp.sort === "string" ? sp.sort : undefined);
  const selectedId = typeof sp.candidate === "string" ? sp.candidate : null;
  const comparisonIds = parseComparisonIds(typeof sp.compare === "string" ? sp.compare : undefined);
  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const admin = createAdminClient();

  const { data: posting } = await admin
    .from("job_postings")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!posting) notFound();

  const shownTitle = pickLocalized(
    { ru: posting.title_ru, uz: posting.title_uz, en: posting.title_en },
    locale,
    posting.title,
  );

  // Count buckets based on match_score + status for TezHR-style chips
  const { data: allRows } = await admin
    .from("candidates")
    .select("status,match_score")
    .eq("job_posting_id", id);

  const counts = {
    total: 0,
    new: 0,
    recommend: 0,
    review: 0,
    reject: 0,
    mismatch: 0,
    analyzed: 0,
    pending: 0,
    failed: 0,
    screened_out: 0,
    invited: 0,
  };
  for (const c of allRows ?? []) {
    counts.total++;
    if (c.status === "pending_analysis" || c.status === "analyzing") {
      counts.pending++;
      counts.new++;
    }
    if (c.status === "analyzed") counts.analyzed++;
    if (c.status === "analysis_failed") counts.failed++;
    if (c.status === "rejected_screening") counts.screened_out++;
    if (c.status === "invited") counts.invited++;

    const s = c.match_score ?? -1;
    if (c.status === "unscored") {
      counts.mismatch++;
    } else if (c.status === "rejected_screening") {
      counts.reject++;
    } else {
      if (s >= 80 && (c.status === "analyzed" || c.status === "invited")) counts.recommend++;
      else if (s >= 60 && s < 80) counts.review++;
      else if (s >= 0 && s < 60 && c.status === "analyzed") counts.reject++;
    }
  }

  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let candidatesQuery = admin
    .from("candidates")
    .select("*", { count: "exact" })
    .eq("job_posting_id", id)
    .neq("status", "rejected_screening");

  if (queryText) candidatesQuery = candidatesQuery.ilike("full_name", `%${queryText}%`);
  if (filter === "new") {
    candidatesQuery = candidatesQuery.in("status", ["pending_analysis", "analyzing"]);
  } else if (filter === "recommend") {
    candidatesQuery = candidatesQuery.in("status", ["analyzed", "invited"]).gte("match_score", 80);
  } else if (filter === "review") {
    candidatesQuery = candidatesQuery.gte("match_score", 60).lt("match_score", 80);
  } else if (filter === "reject") {
    candidatesQuery = candidatesQuery.eq("status", "analyzed").lt("match_score", 60);
  } else if (filter === "mismatch") {
    candidatesQuery = candidatesQuery.eq("status", "unscored");
  }

  if (sort === "newest") {
    candidatesQuery = candidatesQuery.order("created_at", { ascending: false });
  } else if (sort === "oldest") {
    candidatesQuery = candidatesQuery.order("created_at", { ascending: true });
  } else if (sort === "name") {
    candidatesQuery = candidatesQuery.order("full_name", { ascending: true });
  } else {
    candidatesQuery = candidatesQuery.order("match_score", { ascending: false, nullsFirst: false });
  }

  const { data: candidates, count } = await candidatesQuery.range(from, to);

  const contextIds = [...new Set([selectedId, ...comparisonIds].filter(Boolean))] as string[];
  const { data: contextCandidates } =
    contextIds.length > 0
      ? await admin
          .from("candidates")
          .select("*")
          .eq("job_posting_id", id)
          .in("id", contextIds)
      : { data: [] };
  const selectedCandidate =
    (contextCandidates ?? []).find((candidate) => candidate.id === selectedId) ?? null;

  const { data: screenedOut } = await admin
    .from("candidates")
    .select("id, full_name, created_at, status")
    .eq("job_posting_id", id)
    .eq("status", "rejected_screening")
    .order("created_at", { ascending: false });

  const templates: Record<string, string> = {};
  const TEMPLATE_KEYS = ["telegram_invite_ru", "telegram_invite_uz", "telegram_invite_en"];

  const { data: platformDefaults } = await admin
    .from("platform_settings")
    .select("key, value")
    .in("key", TEMPLATE_KEYS);
  for (const s of platformDefaults ?? []) templates[s.key] = s.value;

  const { data: companyOverrides } = await admin
    .from("company_settings")
    .select("key, value")
    .eq("company_id", companyId)
    .in("key", TEMPLATE_KEYS);
  for (const s of companyOverrides ?? []) templates[s.key] = s.value;

  const daysPosted = computeDaysSince(posting.created_at);

  return (
    <div className="flex h-[calc(100dvh-6.5rem)] min-h-[620px] flex-col">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className={selectedId ? "hidden shrink-0 pb-4 md:block" : "shrink-0 pb-4"}>
        {/* Breadcrumb */}
        <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-subtle)]">
          <Link
            href="/hr/jobs"
            className="inline-flex min-h-9 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]"
          >
            <ChevronLeft className="h-3 w-3" />
            {t("hr.nav.jobs", locale)}
          </Link>
          <span>/</span>
          <span>{t("hr.nav.candidates", locale)}</span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-[clamp(1.5rem,4vw,1.85rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
                {shownTitle}
              </h1>
              <Badge tone={posting.status === "active" ? "success" : "neutral"} variant="dot">
                {t(
                  posting.status === "active" ? "hr.job.status.active" : "hr.job.status.closed",
                  locale,
                )}
              </Badge>
              <span
                className="data-mono text-[10.5px] tracking-[0.08em] text-[var(--color-text-subtle)] uppercase"
              >
                {counts.total} {t("hr.applicants.header.candidates_suffix", locale)}
                {" · "}
                {t("hr.applicants.header.posted_prefix", locale)}{" "}
                {daysPosted === 0
                  ? t("hr.time.today", locale)
                  : daysPosted === 1
                    ? t("hr.time.yesterday", locale)
                    : t("hr.time.days_ago", locale, { days: String(daysPosted) })}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button asChild variant="secondary" size="sm">
              <Link href={`/hr/jobs/${id}`}>
                <Link2 className="h-3.5 w-3.5" />
                {t("hr.applicants.share_apply", locale)}
              </Link>
            </Button>
            <Button variant="secondary" size="sm">
              <Download className="h-3.5 w-3.5" />
              {t("hr.applicants.export", locale)}
            </Button>
            <Button variant="ghost" size="sm" aria-label={t("common.more", locale)}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Split view ──────────────────────────────────────────── */}
      <ApplicantsClient
        postingId={id}
        postingTitle={shownTitle}
        companyId={companyId}
        appUrl={env.APP_URL}
        initialCandidates={(candidates ?? []) as Candidate[]}
        initialSelectedCandidate={selectedCandidate as Candidate | null}
        initialComparisonCandidates={(contextCandidates ?? []) as Candidate[]}
        initialScreenedOut={
          (screenedOut ?? []) as Pick<Candidate, "id" | "full_name" | "created_at" | "status">[]
        }
        totalCount={count ?? 0}
        pageSize={PAGE_SIZE}
        initialPage={page}
        initialQuery={queryText}
        initialFilter={filter}
        initialSort={sort}
        failedCount={counts.failed}
        templates={templates}
        counts={{
          all: counts.total,
          new: counts.new,
          recommend: counts.recommend,
          review: counts.review,
          reject: counts.reject,
          mismatch: counts.mismatch,
        }}
      />
    </div>
  );
}
