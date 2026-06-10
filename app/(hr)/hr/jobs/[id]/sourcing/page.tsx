export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Radar } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { Badge, EmptyState, Panel, PanelHeader, PanelTitle } from "@/components/ui";
import { FindCandidatesButton } from "@/components/hr/sourcing/find-candidates-button";
import { SourcingAutoRefresh } from "@/components/hr/sourcing/sourcing-auto-refresh";
import { availableSourcesForCompany } from "@/lib/sourcing/availability";
import type { BadgeTone } from "@/components/ui";
import type { TranslationKey } from "@/lib/i18n/types";
import type { SourcingStats, SourcingStatus } from "@/lib/sourcing/types";

const STATUS_KEY: Record<SourcingStatus, TranslationKey> = {
  queued: "sourcing.results.status.queued",
  running: "sourcing.results.status.running",
  completed: "sourcing.results.status.completed",
  partial: "sourcing.results.status.partial",
  failed: "sourcing.results.status.failed",
};

const STATUS_TONE: Record<SourcingStatus, BadgeTone> = {
  queued: "neutral",
  running: "info",
  completed: "success",
  partial: "warning",
  failed: "danger",
};

export default async function SourcingRunsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = await params;
  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const admin = createAdminClient();

  const { data: job } = await admin
    .from("job_postings")
    .select("title, title_ru, title_uz, title_en")
    .eq("id", jobId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!job) notFound();

  const jobTitle = pickLocalized(
    { ru: job.title_ru, uz: job.title_uz, en: job.title_en },
    locale,
    job.title,
  );

  const { data: runs } = await admin
    .from("sourcing_searches")
    .select("id, created_at, status, stats, cost_usd, input_tokens, output_tokens")
    .eq("job_posting_id", jobId)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const rows = runs ?? [];
  const hasInflight = rows.some((r) => r.status === "queued" || r.status === "running");
  const availableSources = await availableSourcesForCompany(companyId);

  return (
    <div>
      <SourcingAutoRefresh active={hasInflight} />

      {/* Breadcrumb */}
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-subtle)]">
        <Link
          href={`/hr/jobs/${jobId}`}
          className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-1 text-[11.5px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="h-3 w-3" />
          {jobTitle}
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-[var(--color-text)]">{t("sourcing.runs.breadcrumb", locale)}</span>
      </div>

      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.5rem,4vw,1.65rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
            {t("sourcing.runs.title", locale)}
          </h1>
          <p className="mt-1.5 max-w-[640px] text-[13px] text-[var(--color-text-muted)]">
            {t("sourcing.runs.subtitle", locale)}
          </p>
        </div>
        <div className="shrink-0">
          <FindCandidatesButton
            jobId={jobId}
            variant="primary"
            label={t("sourcing.runs.new", locale)}
            availableSources={availableSources}
          />
        </div>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle count={rows.length}>{t("sourcing.runs.title", locale)}</PanelTitle>
        </PanelHeader>
        {rows.length === 0 ? (
          <EmptyState
            icon={<Radar />}
            title={t("sourcing.runs.empty_title", locale)}
            description={t("sourcing.runs.empty_hint", locale)}
            compact
          />
        ) : (
          <ul>
            {rows.map((run) => {
              const status = run.status as SourcingStatus;
              const stats = (run.stats ?? {}) as Partial<SourcingStats>;
              return (
                <li key={run.id} className="border-b border-[var(--color-line)] last:border-b-0">
                  <Link
                    href={`/hr/jobs/${jobId}/sourcing/${run.id}`}
                    className="flex min-h-[56px] items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-[var(--color-surface-subtle)] sm:px-5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Badge tone={STATUS_TONE[status]}>{t(STATUS_KEY[status], locale)}</Badge>
                      <span className="text-[12.5px] whitespace-nowrap text-[var(--color-text-muted)]">
                        {new Date(run.created_at).toLocaleString(locale, {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="data-mono hidden text-[11.5px] text-[var(--color-text-subtle)] sm:inline">
                        {t("sourcing.runs.funnel_summary", locale, {
                          fetched: String(stats.fetched ?? 0),
                          shortlisted: String(stats.shortlisted ?? 0),
                        })}
                      </span>
                      <span className="data-mono text-[11px] text-[var(--color-text-subtle)]">
                        ${Number(run.cost_usd ?? 0).toFixed(4)}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)]" />
                    </div>
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
