export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight, Radar } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { Panel, PanelHeader, PanelTitle, EmptyState } from "@/components/ui";
import type { Locale } from "@/lib/i18n/types";

function relativeDay(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return t("hr.time.today", locale);
  if (days === 1) return t("hr.time.yesterday", locale);
  return t("hr.time.days_ago", locale, { days: String(days) });
}

/**
 * Sourcing hub — the destination for the primary "Sourcing" navigation item.
 * Lists active positions as entry points into their per-job outbound search
 * surfaces (Phase 6 owns the search workflow itself). Kept intentionally lean.
 */
export default async function SourcingHubPage() {
  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const admin = createAdminClient();

  const { data: jobs } = await admin
    .from("job_postings")
    .select("id, title, title_ru, title_uz, title_en, created_at")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  const activeJobs = jobs ?? [];
  const jobIds = activeJobs.map((j) => j.id);

  // One query for all searches across the active jobs; bucketed in memory.
  const searchesByJob: Record<string, { count: number; last: string | null }> = {};
  if (jobIds.length) {
    const { data: searches } = await admin
      .from("sourcing_searches")
      .select("job_posting_id, created_at")
      .in("job_posting_id", jobIds)
      .order("created_at", { ascending: false });
    for (const s of searches ?? []) {
      const bucket = (searchesByJob[s.job_posting_id] ??= { count: 0, last: null });
      bucket.count += 1;
      if (!bucket.last) bucket.last = s.created_at;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="mb-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase font-[var(--font-mono)]">
          {t("hr.sourcing.eyebrow", locale)}
        </div>
        <h1 className="text-[28px] font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
          {t("hr.sourcing.title", locale)}
        </h1>
        <p className="mt-1.5 max-w-[600px] text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
          {t("hr.sourcing.subtitle", locale)}
        </p>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle count={activeJobs.length}>{t("hr.nav.jobs", locale)}</PanelTitle>
        </PanelHeader>
        {activeJobs.length === 0 ? (
          <EmptyState
            icon={<Radar />}
            title={t("hr.sourcing.empty_title", locale)}
            description={t("hr.sourcing.empty_hint", locale)}
            compact
          />
        ) : (
          <ul>
            {activeJobs.map((job) => {
              const meta = searchesByJob[job.id];
              const title = pickLocalized(
                { ru: job.title_ru, uz: job.title_uz, en: job.title_en },
                locale,
                job.title,
              );
              return (
                <li
                  key={job.id}
                  className="border-b border-[var(--color-line)] last:border-b-0"
                >
                  <Link
                    href={`/hr/jobs/${job.id}/sourcing`}
                    className="flex min-h-[56px] items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--color-surface-subtle)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface-strong)] text-[var(--color-text-subtle)]">
                        <Radar className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-semibold tracking-[-0.008em] text-[var(--color-text)]">
                          {title}
                        </div>
                        <div className="mt-0.5 text-[11.5px] text-[var(--color-text-muted)]">
                          {meta
                            ? `${t("hr.sourcing.searches_count", locale, { n: String(meta.count) })} · ${relativeDay(meta.last, locale)}`
                            : t("hr.sourcing.never_run", locale)}
                        </div>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="hidden text-[12px] font-medium text-[var(--color-primary)] sm:inline">
                        {t("hr.sourcing.find", locale)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-[var(--color-text-subtle)]" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}
