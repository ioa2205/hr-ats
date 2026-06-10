export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Plus,
  Inbox,
  RotateCcw,
  Briefcase,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getQuotaState } from "@/lib/companies/quota";
import { weekStartTashkent } from "@/lib/time";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  Button,
  Avatar,
  Badge,
  EmptyState,
  AIFitScore,
} from "@/components/ui";
import { cn } from "@/lib/utils";

interface OwnerRow {
  id: string;
  full_name: string | null;
}

function formatEyebrow(locale: Locale) {
  const today = new Date();
  const bcp = locale === "uz" ? "uz-Latn-UZ" : locale === "ru" ? "ru-RU" : "en-GB";
  try {
    return new Intl.DateTimeFormat(bcp, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(today);
  } catch {
    return today.toISOString().slice(0, 10);
  }
}

function daysAgoLabel(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return t("hr.time.today", locale);
  if (days === 1) return t("hr.time.yesterday", locale);
  return t("hr.time.days_ago", locale, { days: String(days) });
}

export default async function DashboardPage() {
  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const supabaseAdmin = createAdminClient();

  const weekStart = weekStartTashkent();
  const priorWeekStart = new Date(new Date(weekStart).getTime() - 7 * 86400000).toISOString();

  // Company jobs once — reuse id list across candidate queries
  const { data: companyJobs } = await supabaseAdmin
    .from("job_postings")
    .select("id")
    .eq("company_id", companyId);
  const jobIds = (companyJobs ?? []).map((j) => j.id);

  // First-run: a company with no positions at all lands here. Show a focused
  // "create your first position" call to action instead of an empty dashboard.
  if (jobIds.length === 0) {
    const quota = await getQuotaState(companyId);
    return (
      <div className="flex flex-col gap-4">
        <p className="font-[var(--font-mono)] text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
          {t("hr.dashboard.eyebrow", locale, { date: formatEyebrow(locale) })}
        </p>
        <Panel>
          <EmptyState
            icon={<Sparkles />}
            title={t("hr.dashboard.first_run.title", locale)}
            description={t("hr.dashboard.first_run.body", locale)}
            action={
              <Button asChild>
                <Link href="/hr/jobs/new">
                  <Plus className="h-4 w-4" />
                  {t("hr.jobs.create", locale)}
                </Link>
              </Button>
            }
          />
          {quota && quota.status === "trialing" && (
            <p className="border-t border-[var(--color-line)] px-6 py-3 text-center font-[var(--font-mono)] text-[11px] text-[var(--color-text-subtle)]">
              {t("hr.dashboard.first_run.trial", locale, {
                days: String(quota.daysRemaining),
                jobs: String(quota.jobQuotaLimit),
                cv: String(quota.cvQuotaLimit),
              })}
            </p>
          )}
        </Panel>
      </div>
    );
  }

  const [
    activeJobsRes,
    applicantsWeekRes,
    applicantsPriorWeekRes,
    newCandidatesRes,
    topPicksCountRes,
    activeJobsList,
    pipelineAllRes,
    pipelineAnalyzedRes,
    pipelineInvitedRes,
    pipelineRejectedRes,
    topPicksList,
    activityRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("job_postings")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active"),
    jobIds.length
      ? supabaseAdmin
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .in("job_posting_id", jobIds)
          .gte("created_at", weekStart)
          .neq("status", "rejected_screening")
      : Promise.resolve({ count: 0 }),
    jobIds.length
      ? supabaseAdmin
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .in("job_posting_id", jobIds)
          .gte("created_at", priorWeekStart)
          .lt("created_at", weekStart)
          .neq("status", "rejected_screening")
      : Promise.resolve({ count: 0 }),
    jobIds.length
      ? supabaseAdmin
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .in("job_posting_id", jobIds)
          .in("status", ["pending_analysis", "analyzing"])
      : Promise.resolve({ count: 0 }),
    jobIds.length
      ? supabaseAdmin
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .in("job_posting_id", jobIds)
          .gte("match_score", 80)
          .in("status", ["analyzed", "invited"])
      : Promise.resolve({ count: 0 }),
    supabaseAdmin
      .from("job_postings_with_counts")
      .select(
        "id,title,title_ru,title_uz,title_en,status,created_at,created_by,total_count,qualified_count,invited_count,screened_out_count",
      )
      .eq("company_id", companyId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5),
    jobIds.length
      ? supabaseAdmin
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .in("job_posting_id", jobIds)
      : Promise.resolve({ count: 0 }),
    jobIds.length
      ? supabaseAdmin
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .in("job_posting_id", jobIds)
          .in("status", ["analyzed", "invited", "rejected"])
      : Promise.resolve({ count: 0 }),
    jobIds.length
      ? supabaseAdmin
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .in("job_posting_id", jobIds)
          .eq("status", "invited")
      : Promise.resolve({ count: 0 }),
    jobIds.length
      ? supabaseAdmin
          .from("candidates")
          .select("*", { count: "exact", head: true })
          .in("job_posting_id", jobIds)
          .in("status", ["rejected", "rejected_screening"])
      : Promise.resolve({ count: 0 }),
    jobIds.length
      ? supabaseAdmin
          .from("candidates")
          .select(
            "id,full_name,match_score,status,job_posting_id,one_line_summary,one_line_summary_uz,one_line_summary_en,created_at",
          )
          .in("job_posting_id", jobIds)
          .gte("match_score", 80)
          .in("status", ["analyzed", "invited"])
          .order("match_score", { ascending: false })
          .limit(4)
      : Promise.resolve({ data: [] }),
    supabaseAdmin
      .from("audit_log")
      .select("id,actor,action,entity_type,entity_id,created_at")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  // Fetch owner names for the active jobs list
  const ownerIds = Array.from(
    new Set(
      (activeJobsList.data ?? [])
        .map((j) => j.created_by)
        .filter((x): x is string => typeof x === "string"),
    ),
  );
  let owners: Record<string, string> = {};
  if (ownerIds.length) {
    const { data: profs } = await supabaseAdmin
      .from("profiles")
      .select("id,full_name")
      .in("id", ownerIds);
    owners = Object.fromEntries(
      (profs ?? []).map((p: OwnerRow) => [p.id, p.full_name ?? ""]),
    );
  }

  // Job-level "new"/"top" counts + a platform-wide failed count — one query,
  // bucketed in-memory (no extra round trips).
  const newByJob: Record<string, number> = {};
  const topByJob: Record<string, number> = {};
  let failedTotal = 0;
  if (jobIds.length) {
    const { data: pending } = await supabaseAdmin
      .from("candidates")
      .select("job_posting_id,status,match_score")
      .in("job_posting_id", jobIds);
    for (const c of pending ?? []) {
      if (c.status === "pending_analysis" || c.status === "analyzing") {
        newByJob[c.job_posting_id] = (newByJob[c.job_posting_id] ?? 0) + 1;
      }
      if (
        (c.match_score ?? 0) >= 80 &&
        (c.status === "analyzed" || c.status === "invited")
      ) {
        topByJob[c.job_posting_id] = (topByJob[c.job_posting_id] ?? 0) + 1;
      }
      if (c.status === "analysis_failed") failedTotal += 1;
    }
  }

  const activeJobs = activeJobsList.data ?? [];
  const activeJobsCount = activeJobsRes.count ?? 0;
  const newCandidates = newCandidatesRes.count ?? 0;
  const topPicks = topPicksCountRes.count ?? 0;
  const weekCount = applicantsWeekRes.count ?? 0;
  const priorCount = applicantsPriorWeekRes.count ?? 0;
  const weekDelta =
    priorCount > 0
      ? Math.round(((weekCount - priorCount) / priorCount) * 100)
      : weekCount > 0
        ? 100
        : 0;

  const pipelineTotal = pipelineAllRes.count ?? 0;
  const pipelineStages = [
    { key: "applied", count: pipelineTotal },
    { key: "screened", count: pipelineAnalyzedRes.count ?? 0 },
    { key: "top", count: topPicks },
    { key: "invited", count: pipelineInvitedRes.count ?? 0 },
    { key: "rejected", count: pipelineRejectedRes.count ?? 0 },
  ];
  const maxStage = Math.max(...pipelineStages.map((s) => s.count), 1);

  const activity = activityRes.data ?? [];
  const topList = topPicksList.data ?? [];
  const hasQueue = newCandidates > 0 || topPicks > 0 || failedTotal > 0;

  const kpis: { label: string; value: string; delta?: string; deltaTone?: "up" | "down" | "flat"; accent?: boolean }[] = [
    { label: t("hr.dashboard.kpi.active_jobs", locale), value: String(activeJobsCount) },
    {
      label: t("hr.dashboard.kpi.applicants_week", locale),
      value: String(weekCount),
      delta: weekDelta > 0 ? `+${weekDelta}%` : `${weekDelta}%`,
      deltaTone: weekDelta > 0 ? "up" : weekDelta < 0 ? "down" : "flat",
    },
    { label: t("hr.dashboard.kpi.top_picks", locale), value: String(topPicks), accent: true },
    {
      label: t("hr.dashboard.kpi.median_time", locale),
      value: "—",
      delta: t("hr.dashboard.kpi.no_data", locale),
      deltaTone: "flat",
    },
  ];

  return (
    <div className="flex flex-col gap-7">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1.5 font-[var(--font-mono)] text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
            {t("hr.dashboard.eyebrow", locale, { date: formatEyebrow(locale) })}
          </p>
          <h1 className="max-w-[640px] text-[clamp(1.5rem,4vw,1.85rem)] font-bold leading-[1.12] tracking-[-0.02em] text-[var(--color-text)]">
            {newCandidates > 0 ? (
              <>
                <span className="tabular-nums text-[var(--color-accent)]">{newCandidates}</span>{" "}
                {t("hr.dashboard.hero.lede_b", locale)}
              </>
            ) : (
              t("hr.dashboard.queue.all_clear", locale)
            )}
          </h1>
          <p className="mt-1.5 max-w-[560px] text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
            {t("hr.dashboard.hero.sub", locale)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:shrink-0">
          <Button asChild>
            <Link href="/hr/candidates">
              <Sparkles className="h-4 w-4" />
              {t("hr.dashboard.hero.open_queue", locale)}
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/hr/jobs">{t("hr.dashboard.hero.view_jobs", locale)}</Link>
          </Button>
        </div>
      </header>

      {/* Needs attention — the daily queue */}
      <section className="flex flex-col gap-3">
        <SectionLabel>{t("hr.dashboard.queue.title", locale)}</SectionLabel>
        {hasQueue ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <QueueCard
              href="/hr/candidates"
              icon={<Inbox />}
              tone="priority"
              count={newCandidates}
              label={t("hr.dashboard.queue.new", locale)}
              hint={t("hr.dashboard.queue.new_hint", locale)}
            />
            <QueueCard
              href="/hr/candidates"
              icon={<Sparkles />}
              tone="intelligence"
              count={topPicks}
              label={t("hr.dashboard.kpi.top_picks", locale)}
              hint={t("hr.dashboard.queue.top_hint", locale)}
            />
            {failedTotal > 0 && (
              <QueueCard
                href="/hr/candidates"
                icon={<RotateCcw />}
                tone="warning"
                count={failedTotal}
                label={t("hr.dashboard.queue.failed", locale)}
                hint={t("hr.dashboard.queue.failed_hint", locale)}
              />
            )}
          </div>
        ) : (
          <Panel>
            <EmptyState
              icon={<Sparkles />}
              title={t("hr.dashboard.queue.all_clear", locale)}
              description={t("hr.dashboard.queue.all_clear_hint", locale)}
              compact
            />
          </Panel>
        )}
      </section>

      {/* Active jobs + AI top picks */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel>
          <PanelHeader>
            <PanelTitle count={activeJobsCount}>{t("hr.dashboard.active_jobs", locale)}</PanelTitle>
            <ViewAllLink href="/hr/jobs" locale={locale} />
          </PanelHeader>
          {activeJobs.length === 0 ? (
            <EmptyState
              icon={<Briefcase />}
              title={t("hr.dashboard.empty_jobs", locale)}
              action={
                <Button asChild variant="secondary" size="sm">
                  <Link href="/hr/jobs/new">
                    <Plus className="h-3.5 w-3.5" />
                    {t("hr.jobs.create", locale)}
                  </Link>
                </Button>
              }
              compact
            />
          ) : (
            <>
              {/* Desktop / tablet table */}
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-line)]">
                      <Th>{t("hr.jobs.column.title", locale)}</Th>
                      <Th>{t("hr.dashboard.column.owner", locale)}</Th>
                      <Th align="right">{t("hr.dashboard.column.new", locale)}</Th>
                      <Th align="right">{t("hr.dashboard.column.total", locale)}</Th>
                      <Th align="right">{t("hr.dashboard.column.top_picks", locale)}</Th>
                      <Th align="right">{t("hr.dashboard.column.posted", locale)}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeJobs.map((j) => {
                      const ownerName = (j.created_by && owners[j.created_by]) || "";
                      const newN = newByJob[j.id ?? ""] ?? 0;
                      const topN = topByJob[j.id ?? ""] ?? 0;
                      const title = pickLocalized(
                        { ru: j.title_ru, uz: j.title_uz, en: j.title_en },
                        locale,
                        j.title ?? "",
                      );
                      return (
                        <tr
                          key={j.id ?? ""}
                          className="border-b border-[var(--color-line)] transition-colors last:border-0 hover:bg-[var(--color-surface-subtle)]"
                        >
                          <Td>
                            <Link
                              href={`/hr/jobs/${j.id}`}
                              className="inline-flex items-center gap-2 font-semibold tracking-[-0.008em] text-[var(--color-text)] hover:text-[var(--color-primary)]"
                            >
                              <span className="truncate">{title}</span>
                              {newN > 5 && (
                                <Badge tone="accent" size="sm" variant="dot">
                                  +{newN} {t("hr.dashboard.new_suffix", locale)}
                                </Badge>
                              )}
                            </Link>
                          </Td>
                          <Td>
                            {ownerName ? (
                              <span className="flex items-center gap-2">
                                <Avatar name={ownerName} size="xs" />
                                <span className="text-[var(--color-text-muted)]">
                                  {ownerName.split(/\s+/)[0]}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[var(--color-text-subtle)]">—</span>
                            )}
                          </Td>
                          <Td align="right" mono>
                            {newN > 0 ? (
                              <span className="font-semibold text-[var(--color-accent)]">{newN}</span>
                            ) : (
                              <span className="text-[var(--color-text-subtle)]">—</span>
                            )}
                          </Td>
                          <Td align="right" mono>
                            {j.total_count ?? 0}
                          </Td>
                          <Td align="right" mono>
                            {topN > 0 ? (
                              <span className="font-semibold text-[var(--color-primary)]">{topN}</span>
                            ) : (
                              <span className="text-[var(--color-text-subtle)]">—</span>
                            )}
                          </Td>
                          <Td align="right" mono subtle>
                            {daysAgoLabel(j.created_at, locale)}
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <ul className="flex flex-col divide-y divide-[var(--color-line)] sm:hidden">
                {activeJobs.map((j) => {
                  const newN = newByJob[j.id ?? ""] ?? 0;
                  const topN = topByJob[j.id ?? ""] ?? 0;
                  const title = pickLocalized(
                    { ru: j.title_ru, uz: j.title_uz, en: j.title_en },
                    locale,
                    j.title ?? "",
                  );
                  return (
                    <li key={j.id ?? ""}>
                      <Link
                        href={`/hr/jobs/${j.id}`}
                        className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-[var(--color-surface-subtle)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-semibold text-[var(--color-text)]">
                            {title}
                          </span>
                          {newN > 0 && (
                            <Badge tone="accent" size="sm" variant="dot">
                              +{newN}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 font-[var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">
                          <MetaStat label={t("hr.dashboard.column.total", locale)} value={String(j.total_count ?? 0)} />
                          <MetaStat
                            label={t("hr.dashboard.column.top_picks", locale)}
                            value={String(topN)}
                            tone={topN > 0 ? "primary" : undefined}
                          />
                          <MetaStat label={t("hr.dashboard.column.posted", locale)} value={daysAgoLabel(j.created_at, locale)} />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Panel>

        {/* AI top picks */}
        <Panel>
          <PanelHeader>
            <PanelTitle count={topPicks}>{t("hr.dashboard.top_picks.title", locale)}</PanelTitle>
            <ViewAllLink href="/hr/candidates" locale={locale} />
          </PanelHeader>
          {topList.length === 0 ? (
            <EmptyState
              icon={<Sparkles />}
              title={t("hr.dashboard.top_picks.empty", locale)}
              compact
            />
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {topList.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/hr/jobs/${c.job_posting_id}/applicants?candidate=${c.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--color-surface-subtle)]"
                  >
                    <Avatar name={c.full_name} accent size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-semibold text-[var(--color-text)]">
                        {c.full_name}
                      </div>
                      <div className="truncate text-[11.5px] text-[var(--color-text-muted)]">
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
                    <AIFitScore
                      score={c.match_score ?? 0}
                      label={t("hr.dashboard.kpi.top_picks", locale)}
                      variant="compact"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Secondary analytics */}
      <section className="flex flex-col gap-3">
        <SectionLabel>{t("hr.dashboard.overview", locale)}</SectionLabel>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map((k, i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3.5"
            >
              <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{k.label}</span>
              <span className="flex items-baseline gap-1.5">
                <span
                  className={cn(
                    "text-[22px] font-bold leading-none tracking-[-0.02em] tabular-nums",
                    k.accent ? "text-[var(--color-primary)]" : "text-[var(--color-text)]",
                  )}
                >
                  {k.value}
                </span>
                {k.delta && (
                  <span
                    className={cn(
                      "font-[var(--font-mono)] text-[10.5px] font-medium",
                      k.deltaTone === "up"
                        ? "text-[var(--color-success)]"
                        : k.deltaTone === "down"
                          ? "text-[var(--color-danger)]"
                          : "text-[var(--color-text-subtle)]",
                    )}
                  >
                    {k.delta}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Pipeline */}
          <Panel>
            <PanelHeader>
              <PanelTitle>{t("hr.dashboard.pipeline.title", locale)}</PanelTitle>
            </PanelHeader>
            <div className="flex flex-col gap-2.5 p-4">
              {pipelineStages.map((s, i) => {
                const pct = Math.round((s.count / maxStage) * 100);
                const fill = i === 2 ? "bg-[var(--color-accent)]" : "bg-[var(--color-primary)]";
                return (
                  <div
                    key={s.key}
                    className="grid items-center gap-3"
                    style={{ gridTemplateColumns: "minmax(72px,110px) 1fr 36px" }}
                  >
                    <span className="text-[12px] font-medium text-[var(--color-text-muted)]">
                      {t(`hr.dashboard.pipeline.stage.${s.key}` as TranslationKey, locale)}
                    </span>
                    <span className="relative h-[22px] overflow-hidden rounded-[var(--radius-sm)] bg-[var(--color-surface-strong)]">
                      <span
                        className={cn("absolute inset-y-0 left-0 rounded-[var(--radius-sm)]", fill)}
                        style={{ width: `${Math.max(pct, s.count > 0 ? 4 : 0)}%` }}
                      />
                    </span>
                    <span className="text-right font-[var(--font-mono)] text-[12px] text-[var(--color-text)]">
                      {s.count}
                    </span>
                  </div>
                );
              })}
            </div>
          </Panel>

          {/* Activity */}
          <Panel>
            <PanelHeader>
              <PanelTitle>{t("hr.dashboard.activity.title", locale)}</PanelTitle>
            </PanelHeader>
            {activity.length === 0 ? (
              <p className="px-4 py-8 text-center text-[12px] text-[var(--color-text-subtle)]">
                {t("hr.dashboard.activity.empty", locale)}
              </p>
            ) : (
              <ul className="max-h-[360px] divide-y divide-[var(--color-line)] overflow-y-auto">
                {activity.map((a) => (
                  <li key={a.id} className="px-4 py-3 text-[12.5px] leading-[1.45]">
                    <span className="text-[var(--color-text)]">
                      <strong className="font-semibold">{a.actor}</strong>{" "}
                      <span className="text-[var(--color-text-muted)]">
                        {t(actionLabelKey(a.action), locale)}
                      </span>{" "}
                      <span className="text-[var(--color-text-muted)]">{a.entity_type}</span>
                    </span>
                    <div className="mt-1 font-[var(--font-mono)] text-[10.5px] text-[var(--color-text-subtle)]">
                      {relativeTime(a.created_at, locale)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </section>
    </div>
  );
}

// --- small presentational helpers ---

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-[var(--font-mono)] text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
      {children}
    </h2>
  );
}

function ViewAllLink({ href, locale }: { href: string; locale: Locale }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-1 text-[11.5px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
    >
      {t("hr.dashboard.view_all", locale)}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

const queueTone = {
  priority: {
    icon: "bg-[var(--color-accent-container)] text-[var(--color-on-accent-container)]",
    num: "text-[var(--color-accent)]",
  },
  intelligence: {
    icon: "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]",
    num: "text-[var(--color-primary)]",
  },
  warning: {
    icon: "bg-[var(--color-warning-container)] text-[var(--color-on-warning-container)]",
    num: "text-[var(--color-text)]",
  },
} as const;

function QueueCard({
  href,
  icon,
  count,
  label,
  hint,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  count: number;
  label: string;
  hint: string;
  tone: keyof typeof queueTone;
}) {
  const styles = queueTone[tone];
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 transition-all duration-150 ease-[var(--ease-standard)] hover:border-[var(--color-line-strong)] hover:shadow-level-1"
    >
      <span
        className={cn(
          "relative grid h-10 w-10 shrink-0 place-items-center rounded-[var(--radius-md)] [&>svg]:h-5 [&>svg]:w-5",
          styles.icon,
        )}
        aria-hidden="true"
      >
        {icon}
        {tone === "priority" && count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-accent)]" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className={cn("text-2xl font-bold leading-none tracking-[-0.02em] tabular-nums", count > 0 ? styles.num : "text-[var(--color-text-subtle)]")}>
          {count}
        </div>
        <div className="mt-1.5 text-[13px] font-semibold text-[var(--color-text)]">{label}</div>
        <div className="text-[11.5px] text-[var(--color-text-muted)]">{hint}</div>
      </div>
      <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 -translate-x-1 text-[var(--color-text-subtle)] opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:translate-x-0" />
    </Link>
  );
}

function MetaStat({ label, value, tone }: { label: string; value: string; tone?: "primary" }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-[var(--color-text-subtle)]">{label}</span>
      <span className={tone === "primary" ? "font-semibold text-[var(--color-primary)]" : "text-[var(--color-text)]"}>
        {value}
      </span>
    </span>
  );
}

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className="px-3 py-2 text-[11px] font-semibold text-[var(--color-text-muted)]"
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = "left",
  mono,
  subtle,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  subtle?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-3 py-2.5 align-middle text-[12.5px]",
        mono && "font-[var(--font-mono)] text-[11.5px]",
        subtle ? "text-[var(--color-text-subtle)]" : "text-[var(--color-text)]",
      )}
      style={{ textAlign: align }}
    >
      {children}
    </td>
  );
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

function actionLabelKey(action: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    "job.created": "hr.dashboard.activity.action.job_created",
    "job.updated": "hr.dashboard.activity.action.job_updated",
    "job.closed": "hr.dashboard.activity.action.job_closed",
    "job.reopened": "hr.dashboard.activity.action.job_reopened",
    "candidate.applied": "hr.dashboard.activity.action.applied",
    "candidate.invited": "hr.dashboard.activity.action.invited",
    "candidate.rejected": "hr.dashboard.activity.action.rejected",
  };
  return map[action] ?? "hr.dashboard.activity.action.generic";
}
