export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { Panel, PanelHeader, PanelTitle } from "@/components/hr/design";
import { FindCandidatesButton } from "@/components/hr/sourcing/find-candidates-button";
import { SourcingAutoRefresh } from "@/components/hr/sourcing/sourcing-auto-refresh";
import type { TranslationKey } from "@/lib/i18n/types";
import type { SourcingStats, SourcingStatus } from "@/lib/sourcing/types";

const STATUS_KEY: Record<SourcingStatus, TranslationKey> = {
  queued: "sourcing.results.status.queued",
  running: "sourcing.results.status.running",
  completed: "sourcing.results.status.completed",
  partial: "sourcing.results.status.partial",
  failed: "sourcing.results.status.failed",
};

const STATUS_TONE: Record<SourcingStatus, string> = {
  queued: "bg-bone text-ink-3 border-rule",
  running: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-600 border-red-200",
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

  return (
    <div>
      <SourcingAutoRefresh active={hasInflight} />

      {/* Breadcrumb */}
      <div className="text-ink-5 mb-2 flex items-center gap-1.5 text-[11px] font-medium">
        <Link
          href={`/hr/jobs/${jobId}`}
          className="text-ink-4 hover:bg-bone-2 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 text-[11.5px]"
        >
          <ChevronLeft className="h-3 w-3" />
          {jobTitle}
        </Link>
        <span>/</span>
        <span className="text-ink-3 truncate">{t("sourcing.runs.breadcrumb", locale)}</span>
      </div>

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-ink text-[26px] font-semibold leading-[1.1] tracking-[-0.018em]">
            {t("sourcing.runs.title", locale)}
          </h1>
          <p className="text-ink-4 mt-1.5 max-w-[640px] text-[13px]">
            {t("sourcing.runs.subtitle", locale)}
          </p>
        </div>
        <div className="shrink-0">
          <FindCandidatesButton
            jobId={jobId}
            variant="primary"
            label={t("sourcing.runs.new", locale)}
          />
        </div>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle count={rows.length}>{t("sourcing.runs.title", locale)}</PanelTitle>
        </PanelHeader>
        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-ink-2 text-[14px] font-semibold">
              {t("sourcing.runs.empty_title", locale)}
            </div>
            <p className="text-ink-5 mx-auto mt-1.5 max-w-[420px] text-[12.5px]">
              {t("sourcing.runs.empty_hint", locale)}
            </p>
          </div>
        ) : (
          <ul>
            {rows.map((run) => {
              const status = run.status as SourcingStatus;
              const stats = (run.stats ?? {}) as Partial<SourcingStats>;
              return (
                <li key={run.id} className="border-rule border-b last:border-b-0">
                  <Link
                    href={`/hr/jobs/${jobId}/sourcing/${run.id}`}
                    className="hover:bg-bone-2 flex items-center justify-between gap-4 px-5 py-3.5 transition-colors"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`inline-flex shrink-0 items-center rounded-[4px] border px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[status]}`}
                      >
                        {t(STATUS_KEY[status], locale)}
                      </span>
                      <span className="text-ink-3 text-[12.5px] whitespace-nowrap">
                        {new Date(run.created_at).toLocaleString(locale, {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span
                        className="text-ink-5 hidden text-[11.5px] sm:inline"
                        style={{ fontFamily: "var(--font-tez-mono)" }}
                      >
                        {t("sourcing.runs.funnel_summary", locale, {
                          fetched: String(stats.fetched ?? 0),
                          shortlisted: String(stats.shortlisted ?? 0),
                        })}
                      </span>
                      <span
                        className="text-ink-5 text-[11px]"
                        style={{ fontFamily: "var(--font-tez-mono)" }}
                      >
                        ${Number(run.cost_usd ?? 0).toFixed(4)}
                      </span>
                      <ChevronRight className="text-ink-5 h-4 w-4 shrink-0" />
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
