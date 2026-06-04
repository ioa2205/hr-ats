"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  DollarSign,
  Flame,
  RefreshCw,
  Server,
  TrendingUp,
  Users,
} from "lucide-react";
import { useTranslation } from "@/lib/i18n/provider";
import { LineChart } from "@/components/operator/charts/line-chart";
import type { TranslationKey } from "@/lib/i18n/types";
import { atRiskReasonKey } from "@/lib/operator/enum-labels";

export interface DashboardData {
  generatedAt: string;
  range: 30 | 90;
  health: {
    platform: { state: "ok" | "amber" | "red"; aiFailureRate24h: number };
    aiCostBurn: { state: "ok" | "amber" | "red"; today: number; avgDaily30d: number };
    trialToPaid7d: { pct: number; trials: number; conversions: number };
    mrrEstimate: { usd: number; activeSubs: number; delta30dUsd: number };
  };
  timeseries: Array<{
    day: string;
    activeCompanies: number;
    candidatesProcessed: number;
    dailyActiveUsers: number;
    aiCostUsd: number;
  }>;
  topMovers: {
    growing: Array<{ companyId: string; name: string; delta: number; candidates: number }>;
    atRisk: Array<{ companyId: string; name: string; score: number; reason: string }>;
  };
  recentActivity: Array<{
    id: number;
    action: string;
    actor: string | null;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
  }>;
  workers: Array<{
    worker: string;
    state: "ok" | "amber" | "red";
    lastRunAt: string | null;
    lastError: string | null;
    consecutiveFailures: number;
  }>;
}

const AUTO_REFRESH_MS = 60_000;

export function DashboardView({ initial }: { initial: DashboardData }) {
  const { t } = useTranslation();
  const [data, setData] = useState(initial);
  const [range, setRange] = useState<30 | 90>(initial.range);
  const [refreshing, setRefreshing] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<number>(Date.parse(initial.generatedAt));
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (nextRange: 30 | 90) => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/operator/dashboard?range=${nextRange}`, {
        signal: ctrl.signal,
        cache: "no-store",
      });
      if (!res.ok) return;
      const next = (await res.json()) as DashboardData;
      if (!ctrl.signal.aborted) {
        setData(next);
        setLastAttempt(Date.now());
      }
    } catch {
      /* aborted or network — keep prior data */
    } finally {
      if (!ctrl.signal.aborted) setRefreshing(false);
    }
  }, []);

  // Visibility-aware auto-refresh. Only fires while the tab is visible —
  // background tabs don't hit the API.
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") {
        void fetchData(range);
      }
    };
    const id = window.setInterval(tick, AUTO_REFRESH_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void fetchData(range);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [fetchData, range]);

  function changeRange(next: 30 | 90) {
    setRange(next);
    void fetchData(next);
  }

  return (
    <div className="flex flex-col gap-5 font-[var(--font-tez-sans)]">
      {/* Header */}
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
            {t("operator.dashboard.eyebrow")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-ink)]">
            {t("operator.dashboard.title")}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <RangeToggle range={range} onChange={changeRange} t={t} />
          <RefreshControl
            refreshing={refreshing}
            lastAttempt={lastAttempt}
            onClick={() => void fetchData(range)}
            t={t}
          />
        </div>
      </header>

      {/* Health strip */}
      <HealthStrip health={data.health} t={t} />

      {/* Background workers */}
      <WorkersCard workers={data.workers} t={t} />

      {/* Time-series cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TimeSeriesCard
          title={t("operator.dashboard.series.active_companies")}
          value={data.timeseries.at(-1)?.activeCompanies ?? 0}
          series={data.timeseries.map((p) => ({ day: p.day, value: p.activeCompanies }))}
          icon={<Users className="h-4 w-4" />}
        />
        <TimeSeriesCard
          title={t("operator.dashboard.series.dau")}
          value={data.timeseries.at(-1)?.dailyActiveUsers ?? 0}
          series={data.timeseries.map((p) => ({ day: p.day, value: p.dailyActiveUsers }))}
          icon={<Activity className="h-4 w-4" />}
          stroke="var(--color-tez-blue)"
          fill="var(--color-tez-blue-tint)"
        />
        <TimeSeriesCard
          title={t("operator.dashboard.series.candidates")}
          value={data.timeseries.reduce((s, p) => s + p.candidatesProcessed, 0)}
          subtitle={t("operator.dashboard.series.candidates_sub")}
          series={data.timeseries.map((p) => ({ day: p.day, value: p.candidatesProcessed }))}
          icon={<Flame className="h-4 w-4" />}
          stroke="var(--color-tez-green)"
          fill="var(--color-tez-green-tint)"
        />
      </section>

      {/* Top movers */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TopMoversCard
          title={t("operator.dashboard.movers.growing_title")}
          items={data.topMovers.growing.map((m) => ({
            id: m.companyId,
            name: m.name,
            primary: t("operator.dashboard.movers.growing_primary", {
              n: String(m.candidates),
            }),
            tone: "positive" as const,
          }))}
          icon={<TrendingUp className="h-4 w-4" />}
          t={t}
        />
        <TopMoversCard
          title={t("operator.dashboard.movers.at_risk_title")}
          items={data.topMovers.atRisk.map((m) => ({
            id: m.companyId,
            name: m.name,
            primary: t("operator.dashboard.movers.at_risk_primary", {
              score: String(m.score),
              reasons:
                m.reason.length > 0
                  ? m.reason
                      .split(",")
                      .map((r) => t(atRiskReasonKey(r.trim())))
                      .join(" · ")
                  : "—",
            }),
            tone: "negative" as const,
          }))}
          icon={<AlertTriangle className="h-4 w-4" />}
          t={t}
        />
      </section>

      {/* Recent operator activity */}
      <RecentActivityCard rows={data.recentActivity} t={t} />
    </div>
  );
}

// ----- Sub-components -----

function RangeToggle({
  range,
  onChange,
  t,
}: {
  range: 30 | 90;
  onChange: (r: 30 | 90) => void;
  t: (k: TranslationKey) => string;
}) {
  return (
    <div
      role="tablist"
      aria-label={t("operator.dashboard.range_label")}
      className="flex items-center rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] p-0.5 text-[11px]"
    >
      {(["30", "90"] as const).map((r) => {
        const active = Number(r) === range;
        return (
          <button
            key={r}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(Number(r) as 30 | 90)}
            className={`rounded-[var(--radius-sm)] px-2.5 py-1 font-medium transition-colors ${
              active
                ? "bg-[var(--color-ink)] text-[var(--color-bone)]"
                : "text-[var(--color-ink-4)] hover:text-[var(--color-ink)]"
            }`}
          >
            {r}d
          </button>
        );
      })}
    </div>
  );
}

function RefreshControl({
  refreshing,
  lastAttempt,
  onClick,
  t,
}: {
  refreshing: boolean;
  lastAttempt: number;
  onClick: () => void;
  t: (k: TranslationKey, vars?: Record<string, string>) => string;
}) {
  const [now, setNow] = useState(() => lastAttempt);
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5_000);
    return () => window.clearInterval(id);
  }, []);
  const agoSec = Math.max(0, Math.floor((now - lastAttempt) / 1000));
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={refreshing}
      className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] px-2 py-1 text-[11px] text-[var(--color-ink-4)] hover:bg-[var(--color-bone-2)] disabled:opacity-60"
      aria-label={t("operator.dashboard.refresh")}
    >
      <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
      <span className="nums">
        {t("operator.dashboard.last_updated", { seconds: String(agoSec) })}
      </span>
    </button>
  );
}

function HealthStrip({
  health,
  t,
}: {
  health: DashboardData["health"];
  t: (k: TranslationKey, vars?: Record<string, string>) => string;
}) {
  return (
    <section
      aria-label={t("operator.dashboard.health.label")}
      className="grid grid-cols-2 gap-3 md:grid-cols-4"
    >
      <HealthPill
        label={t("operator.dashboard.health.platform")}
        state={health.platform.state}
        primary={
          health.platform.aiFailureRate24h > 0
            ? t("operator.dashboard.health.failures_24h", {
                pct: (health.platform.aiFailureRate24h * 100).toFixed(1),
              })
            : t("operator.dashboard.health.platform_ok")
        }
        icon={
          health.platform.state === "ok" ? (
            <CheckCircle2 className="h-3.5 w-3.5" />
          ) : (
            <AlertTriangle className="h-3.5 w-3.5" />
          )
        }
      />
      <HealthPill
        label={t("operator.dashboard.health.ai_cost")}
        state={health.aiCostBurn.state}
        primary={t("operator.dashboard.health.cost_today", {
          value: health.aiCostBurn.today.toFixed(2),
        })}
        secondary={t("operator.dashboard.health.cost_avg", {
          value: health.aiCostBurn.avgDaily30d.toFixed(2),
        })}
        icon={<Flame className="h-3.5 w-3.5" />}
      />
      <HealthPill
        label={t("operator.dashboard.health.funnel")}
        state="ok"
        primary={t("operator.dashboard.health.funnel_pct", {
          pct: String(health.trialToPaid7d.pct),
        })}
        secondary={t("operator.dashboard.health.funnel_conv", {
          conv: String(health.trialToPaid7d.conversions),
          trials: String(health.trialToPaid7d.trials),
        })}
        icon={<TrendingUp className="h-3.5 w-3.5" />}
      />
      <HealthPill
        label={t("operator.dashboard.health.mrr")}
        state="ok"
        primary={t("operator.dashboard.health.mrr_value", {
          value: health.mrrEstimate.usd.toLocaleString(),
        })}
        secondary={
          health.mrrEstimate.delta30dUsd === 0
            ? t("operator.dashboard.health.mrr_active", {
                n: String(health.mrrEstimate.activeSubs),
              })
            : t("operator.dashboard.health.mrr_delta", {
                sign: health.mrrEstimate.delta30dUsd >= 0 ? "+" : "-",
                value: String(Math.abs(health.mrrEstimate.delta30dUsd)),
              })
        }
        icon={<DollarSign className="h-3.5 w-3.5" />}
      />
    </section>
  );
}

function HealthPill({
  label,
  state,
  primary,
  secondary,
  icon,
}: {
  label: string;
  state: "ok" | "amber" | "red";
  primary: string;
  secondary?: string;
  icon: React.ReactNode;
}) {
  const toneBorder =
    state === "red"
      ? "border-[var(--color-tez-red)]/50"
      : state === "amber"
        ? "border-[var(--color-tez-amber)]/50"
        : "border-[var(--color-rule-2)]";
  const toneDot =
    state === "red"
      ? "bg-[var(--color-tez-red)]"
      : state === "amber"
        ? "bg-[var(--color-tez-amber)]"
        : "bg-[var(--color-tez-green)]";
  return (
    <div
      className={`flex flex-col gap-1 rounded-[var(--radius-md)] border ${toneBorder} bg-[var(--color-paper)] px-3 py-2.5`}
    >
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--color-ink-5)]">{icon}</span>
          <span>{label}</span>
        </span>
        <span className={`h-1.5 w-1.5 rounded-full ${toneDot}`} />
      </div>
      <p className="nums text-[15px] font-semibold tabular-nums text-[var(--color-ink)]">
        {primary}
      </p>
      {secondary && (
        <p className="text-[11px] text-[var(--color-ink-4)]">{secondary}</p>
      )}
    </div>
  );
}

function TimeSeriesCard({
  title,
  value,
  subtitle,
  series,
  icon,
  stroke,
  fill,
}: {
  title: string;
  value: number;
  subtitle?: string;
  series: Array<{ day: string; value: number }>;
  icon: React.ReactNode;
  stroke?: string;
  fill?: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] p-4">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
        <span className="flex items-center gap-1.5">
          <span className="text-[var(--color-ink-5)]">{icon}</span>
          <span>{title}</span>
        </span>
      </div>
      <p className="nums text-[22px] font-semibold tabular-nums leading-none text-[var(--color-ink)]">
        {value.toLocaleString()}
      </p>
      {subtitle && <p className="text-[11px] text-[var(--color-ink-4)]">{subtitle}</p>}
      <div className="mt-1">
        <LineChart
          data={series}
          stroke={stroke}
          fill={fill}
          format={(v) => Math.round(v).toLocaleString()}
        />
      </div>
    </div>
  );
}

function TopMoversCard({
  title,
  items,
  icon,
  t,
}: {
  title: string;
  items: Array<{ id: string; name: string; primary: string; tone: "positive" | "negative" }>;
  icon: React.ReactNode;
  t: (k: TranslationKey) => string;
}) {
  return (
    <div className="flex flex-col rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--color-rule-2)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
        <span className="text-[var(--color-ink-5)]">{icon}</span>
        <span>{title}</span>
      </div>
      {items.length === 0 ? (
        <p className="p-6 text-center text-[12px] text-[var(--color-ink-4)]">
          {t("operator.dashboard.movers.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-rule)]">
          {items.map((m) => (
            <li key={m.id}>
              <Link
                href={`/operator/companies/${m.id}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px] hover:bg-[var(--color-bone-2)]"
              >
                <span className="truncate font-medium text-[var(--color-ink)]">{m.name}</span>
                <span
                  className={`nums flex items-center gap-1 whitespace-nowrap text-[11px] ${
                    m.tone === "positive"
                      ? "text-[var(--color-tez-green)]"
                      : "text-[var(--color-tez-red)]"
                  }`}
                >
                  {m.tone === "positive" ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {m.primary}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const WORKER_NAME_KEY: Record<string, TranslationKey> = {
  "sourcing-run": "operator.dashboard.workers.name_sourcing",
  "telegram-ingest": "operator.dashboard.workers.name_telegram",
  "notification-retry": "operator.dashboard.workers.name_notifications",
  "process-cv": "operator.dashboard.workers.name_process_cv",
};

function compactAgo(iso: string | null): string {
  if (!iso) return "";
  const sec = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000));
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86400)}d`;
}

function WorkersCard({
  workers,
  t,
}: {
  workers: DashboardData["workers"];
  t: (k: TranslationKey, vars?: Record<string, string>) => string;
}) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)]">
      <div className="flex items-center gap-1.5 border-b border-[var(--color-rule-2)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
        <Server className="h-3.5 w-3.5 text-[var(--color-ink-5)]" />
        <span>{t("operator.dashboard.workers.title")}</span>
      </div>
      {workers.length === 0 ? (
        <p className="p-6 text-center text-[12px] text-[var(--color-ink-4)]">
          {t("operator.dashboard.workers.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-rule)]">
          {workers.map((w) => {
            const dot =
              w.state === "red"
                ? "bg-[var(--color-tez-red)]"
                : w.state === "amber"
                  ? "bg-[var(--color-tez-amber)]"
                  : "bg-[var(--color-tez-green)]";
            const nameKey = WORKER_NAME_KEY[w.worker];
            return (
              <li
                key={w.worker}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 text-[12px]"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-[var(--color-ink)]">
                    {nameKey ? t(nameKey) : w.worker}
                  </span>
                  {w.consecutiveFailures > 0 && w.lastError && (
                    <span className="font-[var(--font-tez-mono)] truncate text-[10px] text-[var(--color-tez-red)]">
                      {t("operator.dashboard.workers.failures", {
                        n: String(w.consecutiveFailures),
                      })}
                    </span>
                  )}
                </div>
                <span className="nums whitespace-nowrap text-[11px] text-[var(--color-ink-4)]">
                  {w.lastRunAt
                    ? t("operator.dashboard.workers.ran_ago", { ago: compactAgo(w.lastRunAt) })
                    : t("operator.dashboard.workers.never")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function RecentActivityCard({
  rows,
  t,
}: {
  rows: DashboardData["recentActivity"];
  t: (k: TranslationKey) => string;
}) {
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)]">
      <div className="flex items-center justify-between border-b border-[var(--color-rule-2)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
        <span>{t("operator.dashboard.activity.title")}</span>
        <Link
          href="/operator/audit"
          className="text-[var(--color-persimmon-2)] hover:underline"
        >
          {t("operator.dashboard.activity.view_all")}
        </Link>
      </div>
      {rows.length === 0 ? (
        <p className="p-6 text-center text-[12px] text-[var(--color-ink-4)]">
          {t("operator.dashboard.activity.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-rule)]">
          {rows.map((r) => (
            <li
              key={r.id}
              className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-2 text-[12px]"
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-[var(--font-tez-mono)] truncate text-[11px] text-[var(--color-ink-3)]">
                  {r.action}
                </span>
                <span className="truncate text-[var(--color-ink-4)]">
                  · {r.actor ?? t("operator.dashboard.activity.system_actor")}
                </span>
              </div>
              <span className="font-[var(--font-tez-mono)] nums whitespace-nowrap text-[10px] text-[var(--color-ink-5)]">
                {new Date(r.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
