export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Link2, Download, MoreHorizontal } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { StatusPill, TezButton } from "@/components/hr/design";
import { ApplicantsClient } from "@/components/hr/applicants/applicants-client";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import type { Candidate } from "@/types";

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
    if (c.status !== "rejected_screening") {
      if (s >= 80 && (c.status === "analyzed" || c.status === "invited")) counts.recommend++;
      else if (s >= 60 && s < 80) counts.review++;
      else if (s >= 0 && s < 60 && c.status === "analyzed") counts.reject++;
    } else {
      counts.reject++;
    }
  }

  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10));
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: candidates, count } = await admin
    .from("candidates")
    .select("*", { count: "exact" })
    .eq("job_posting_id", id)
    .neq("status", "rejected_screening")
    .order("match_score", { ascending: false, nullsFirst: false })
    .range(from, to);

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
    <div className="flex h-[calc(100vh-48px)] flex-col">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="shrink-0 pb-4">
        {/* Breadcrumb */}
        <div className="text-ink-5 mb-1.5 flex items-center gap-1.5 text-[11px] font-medium">
          <Link
            href="/hr/jobs"
            className="text-ink-4 hover:bg-bone-2 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 text-[11.5px]"
          >
            <ChevronLeft className="h-3 w-3" />
            {t("hr.nav.jobs", locale)}
          </Link>
          <span>/</span>
          <span>{t("hr.nav.candidates", locale)}</span>
        </div>

        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-3">
              <h1 className="text-ink text-[28px] font-semibold leading-[1.1] tracking-[-0.018em]">
                {shownTitle}
              </h1>
              <StatusPill
                status={posting.status}
                label={t(
                  posting.status === "active" ? "hr.job.status.active" : "hr.job.status.closed",
                  locale,
                )}
              />
              <span
                className="text-ink-5 text-[10.5px] uppercase tracking-[0.08em]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
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

          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/hr/jobs/${id}`}>
              <TezButton
                variant="secondary"
                size="sm"
                leadingIcon={<Link2 className="h-3 w-3" />}
              >
                {t("hr.applicants.share_apply", locale)}
              </TezButton>
            </Link>
            <TezButton
              variant="secondary"
              size="sm"
              leadingIcon={<Download className="h-3 w-3" />}
            >
              {t("hr.applicants.export", locale)}
            </TezButton>
            <TezButton variant="secondary" size="sm">
              <MoreHorizontal className="h-3 w-3" />
            </TezButton>
          </div>
        </div>
      </div>

      {/* ── Split view ──────────────────────────────────────────── */}
      <ApplicantsClient
        postingId={id}
        postingTitle={shownTitle}
        companyId={companyId}
        appUrl={process.env.APP_URL ?? "http://localhost:3000"}
        initialCandidates={(candidates ?? []) as Candidate[]}
        initialScreenedOut={
          (screenedOut ?? []) as Pick<Candidate, "id" | "full_name" | "created_at" | "status">[]
        }
        totalCount={count ?? 0}
        pageSize={PAGE_SIZE}
        initialPage={page}
        failedCount={counts.failed}
        templates={templates}
        counts={{
          all: counts.total,
          new: counts.new,
          recommend: counts.recommend,
          review: counts.review,
          reject: counts.reject,
        }}
      />
    </div>
  );
}
