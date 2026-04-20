export const dynamic = "force-dynamic";

import Link from "next/link";
import { ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { weekStartTashkent } from "@/lib/time";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  PanelAction,
  KpiBar,
  Avatar,
  Pill,
  ScoreMini,
  TezButton,
  type KpiCellData,
} from "@/components/hr/design";

interface OwnerRow {
  id: string;
  full_name: string | null;
}

function formatEyebrow(locale: Locale) {
  const today = new Date();
  const bcp = locale === "uz" ? "uz-Latn-UZ" : locale === "ru" ? "ru-RU" : "en-GB";
  try {
    const text = new Intl.DateTimeFormat(bcp, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(today);
    return text;
  } catch {
    return today.toISOString().slice(0, 10);
  }
}

function daysAgoLabel(iso: string | null, locale: Locale): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const ms = now.getTime() - d.getTime();
  const days = Math.floor(ms / 86400000);
  if (days === 0) return t("hr.time.today", locale);
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

  // Job-level "new" candidate counts — one query, bucketed in-memory
  const newByJob: Record<string, number> = {};
  const topByJob: Record<string, number> = {};
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

  const kpiCells: KpiCellData[] = [
    {
      label: t("hr.dashboard.kpi.active_jobs", locale),
      value: activeJobsCount,
    },
    {
      label: t("hr.dashboard.kpi.applicants_week", locale),
      value: weekCount,
      delta: weekDelta > 0 ? `+${weekDelta}%` : `${weekDelta}%`,
      deltaTone: weekDelta > 0 ? "up" : weekDelta < 0 ? "down" : "flat",
    },
    {
      label: t("hr.dashboard.kpi.top_picks", locale),
      value: topPicks,
      valueAccent: "persimmon",
    },
    {
      label: t("hr.dashboard.kpi.median_time", locale),
      value: "—",
      delta: t("hr.dashboard.kpi.no_data", locale),
      deltaTone: "flat",
    },
  ];

  const activity = activityRes.data ?? [];
  const todayEyebrow = formatEyebrow(locale);

  return (
    <div>
      {/* Eyebrow */}
      <div
        className="text-ink-5 mb-1.5 flex items-center gap-1.5 text-[11px] font-medium"
      >
        <span>{t("hr.dashboard.eyebrow", locale, { date: todayEyebrow })}</span>
      </div>

      {/* Hero */}
      <section className="mb-5 pb-5">
        <h1 className="text-ink max-w-[680px] text-[28px] font-semibold leading-[1.15] tracking-[-0.018em]">
          <span className="text-persimmon tabular-nums">{newCandidates}</span>{" "}
          {t("hr.dashboard.hero.lede_b", locale)}
        </h1>
        <p className="text-ink-4 mt-1.5 max-w-[580px] text-[13px] leading-[1.5]">
          {t("hr.dashboard.hero.sub", locale)}
        </p>
        <div className="mt-4 flex gap-2">
          <Link href="/hr/candidates">
            <TezButton
              variant="primary"
              leadingIcon={<Sparkles className="h-3.5 w-3.5" />}
            >
              {t("hr.dashboard.hero.open_queue", locale)}
            </TezButton>
          </Link>
          <Link href="/hr/jobs">
            <TezButton variant="secondary">
              {t("hr.dashboard.hero.view_jobs", locale)}
            </TezButton>
          </Link>
        </div>

        <KpiBar cells={kpiCells} />
      </section>

      {/* Two-col: active jobs + activity */}
      <div
        className="mb-6 grid gap-6"
        style={{ gridTemplateColumns: "minmax(0, 1fr) 360px" }}
      >
        <Panel>
          <PanelHeader>
            <PanelTitle count={activeJobsCount}>
              {t("hr.dashboard.active_jobs", locale)}
            </PanelTitle>
            <Link
              href="/hr/jobs"
              className="text-ink-4 hover:text-ink hover:bg-bone-2 flex items-center gap-1.5 rounded-[4px] px-1.5 py-1 text-[11.5px]"
            >
              {t("hr.dashboard.view_all", locale)}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </PanelHeader>
          {activeJobs.length === 0 ? (
            <EmptyRow message={t("hr.dashboard.empty_jobs", locale)} />
          ) : (
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr>
                  <ThSmall>{t("hr.jobs.column.title", locale)}</ThSmall>
                  <ThSmall>{t("hr.dashboard.column.owner", locale)}</ThSmall>
                  <ThSmall align="right">{t("hr.dashboard.column.new", locale)}</ThSmall>
                  <ThSmall align="right">{t("hr.dashboard.column.total", locale)}</ThSmall>
                  <ThSmall align="right">{t("hr.dashboard.column.top_picks", locale)}</ThSmall>
                  <ThSmall align="right" pad={14}>
                    {t("hr.dashboard.column.posted", locale)}
                  </ThSmall>
                </tr>
              </thead>
              <tbody>
                {activeJobs.map((j) => {
                  const ownerName = (j.created_by && owners[j.created_by]) || "";
                  const newN = newByJob[j.id ?? ""] ?? 0;
                  const topN = topByJob[j.id ?? ""] ?? 0;
                  return (
                    <tr
                      key={j.id ?? ""}
                      className="hover:bg-bone border-rule border-t first:border-t-0 transition-colors"
                    >
                      <Td>
                        <Link
                          href={`/hr/jobs/${j.id}`}
                          className="flex items-center gap-2.5"
                        >
                          <span className="text-ink text-[12.5px] font-semibold tracking-[-0.008em]">
                            {pickLocalized(
                              { ru: j.title_ru, uz: j.title_uz, en: j.title_en },
                              locale,
                              j.title ?? "",
                            )}
                          </span>
                          {newN > 5 && (
                            <Pill tone="persimmon">
                              +{newN} {t("hr.dashboard.new_suffix", locale)}
                            </Pill>
                          )}
                        </Link>
                      </Td>
                      <Td>
                        {ownerName ? (
                          <span className="flex items-center gap-2">
                            <Avatar name={ownerName} size="sm" />
                            <span className="text-ink-3 text-[12px]">
                              {ownerName.split(/\s+/)[0]}
                            </span>
                          </span>
                        ) : (
                          <span className="text-ink-5">—</span>
                        )}
                      </Td>
                      <Td align="right" mono>
                        {newN || "—"}
                      </Td>
                      <Td align="right" mono>
                        {j.total_count ?? 0}
                      </Td>
                      <Td align="right" mono>
                        {topN > 0 ? (
                          <span className="text-persimmon font-semibold">{topN}</span>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td align="right" pad={14} mono muted>
                        {daysAgoLabel(j.created_at, locale)}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>

        {/* Activity stream */}
        <Panel>
          <PanelHeader>
            <PanelTitle>{t("hr.dashboard.activity.title", locale)}</PanelTitle>
            <PanelAction aria-label={t("hr.dashboard.refresh", locale)}>
              <RefreshCw className="h-3 w-3" />
            </PanelAction>
          </PanelHeader>
          <div className="max-h-[380px] overflow-y-auto">
            {activity.length === 0 ? (
              <EmptyRow message={t("hr.dashboard.activity.empty", locale)} />
            ) : (
              activity.map((a) => (
                <div
                  key={a.id}
                  className="border-rule flex gap-2.5 border-b px-4 py-3 text-[12.5px] leading-[1.45] last:border-b-0"
                >
                  <div className="flex-1" style={{ color: "var(--color-ink-2)" }}>
                    <strong className="text-ink font-semibold">{a.actor}</strong>{" "}
                    <span className="text-ink-4">
                      {t(actionLabelKey(a.action), locale)}
                    </span>{" "}
                    <span className="text-ink-3">{a.entity_type}</span>
                    <div
                      className="text-ink-5 mt-1 text-[10.5px]"
                      style={{ fontFamily: "var(--font-tez-mono)" }}
                    >
                      {relativeTime(a.created_at, locale)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      {/* Pipeline + Top picks */}
      <div className="grid gap-6 md:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t("hr.dashboard.pipeline.title", locale)}</PanelTitle>
            <span
              className="text-ink-5 text-[10.5px] uppercase tracking-[0.08em]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
              {new Intl.DateTimeFormat(locale === "uz" ? "uz-Latn-UZ" : locale, {
                month: "long",
              }).format(new Date())}
            </span>
          </PanelHeader>
          <div className="px-4 py-4">
            {pipelineStages.map((s, i) => {
              const pct = Math.round((s.count / maxStage) * 100);
              const color =
                i === 0
                  ? "var(--color-ink)"
                  : i < 2
                    ? "var(--color-ink-3)"
                    : i === 2
                      ? "var(--color-persimmon)"
                      : i === 3
                        ? "var(--color-ink-3)"
                        : "var(--color-ink-4)";
              return (
                <div
                  key={s.key}
                  className="mb-2.5 grid items-center gap-3 last:mb-0"
                  style={{ gridTemplateColumns: "120px 1fr 60px" }}
                >
                  <span className="text-ink-3 text-[12px] font-medium">
                    {t(`hr.dashboard.pipeline.stage.${s.key}` as TranslationKey, locale)}
                  </span>
                  <div
                    className="bg-bone-2 relative h-[22px] overflow-hidden rounded-[4px]"
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-[4px]"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                  <span
                    className="text-ink-2 text-right text-[12px]"
                    style={{ fontFamily: "var(--font-tez-mono)" }}
                  >
                    {s.count}
                  </span>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle count={topPicks}>
              {t("hr.dashboard.top_picks.title", locale)}
            </PanelTitle>
            <Link
              href="/hr/candidates"
              className="text-ink-4 hover:text-ink hover:bg-bone-2 flex items-center gap-1.5 rounded-[4px] px-1.5 py-1 text-[11.5px]"
            >
              {t("hr.dashboard.view_all", locale)}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </PanelHeader>
          {(topPicksList.data ?? []).length === 0 ? (
            <EmptyRow message={t("hr.dashboard.top_picks.empty", locale)} />
          ) : (
            <table className="w-full border-collapse text-[12px]">
              <tbody>
                {(topPicksList.data ?? []).map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-bone border-rule border-t first:border-t-0 transition-colors"
                  >
                    <Td>
                      <Link
                        href={`/hr/jobs/${c.job_posting_id}/applicants#${c.id}`}
                        className="flex items-center gap-2.5"
                      >
                        <Avatar name={c.full_name} persimmon size="sm" />
                        <div>
                          <div className="text-ink text-[12.5px] font-semibold">
                            {c.full_name}
                          </div>
                          <div className="text-ink-4 mt-[1px] text-[11px]">
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
                    </Td>
                    <Td align="right" pad={14}>
                      <ScoreMini score={c.match_score ?? 0} persimmon />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </div>
  );
}

// --- small presentational helpers ---

function ThSmall({
  children,
  align,
  pad,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  pad?: number;
}) {
  return (
    <th
      className="text-ink-4 bg-bone border-rule border-b px-3.5 py-2 text-[10.5px] font-semibold"
      style={{
        textAlign: align ?? "left",
        paddingRight: pad ? pad + 10 : undefined,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  pad,
  mono,
  muted,
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  pad?: number;
  mono?: boolean;
  muted?: boolean;
}) {
  return (
    <td
      className="px-3.5 py-1.5 align-middle"
      style={{
        textAlign: align ?? "left",
        paddingRight: pad ? pad + 10 : undefined,
        fontFamily: mono ? "var(--font-tez-mono)" : undefined,
        fontSize: mono ? "11.5px" : undefined,
        color: muted ? "var(--color-ink-5)" : "var(--color-ink-2)",
      }}
    >
      {children}
    </td>
  );
}

function EmptyRow({ message }: { message: string }) {
  return <div className="text-ink-5 px-4 py-8 text-center text-[12px]">{message}</div>;
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
  // Map common audit actions to translation keys; unknown actions fall back to raw action.
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
