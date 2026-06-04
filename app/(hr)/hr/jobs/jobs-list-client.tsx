"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, Plus, Lock, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { JobActionsDropdown } from "@/components/hr/job-actions-dropdown";
import { Panel, StatusPill, Chip, Seg } from "@/components/hr/design";
import { useTranslation } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export interface JobsListItem {
  id: string;
  title: string;
  status: "active" | "closed";
  public_token: string;
  created_at: string;
  qualified_count: number;
  screened_out_count: number;
  failed_count: number;
  total_count?: number;
}

interface JobsListClientProps {
  jobs: JobsListItem[];
  appUrl: string;
  canWrite: boolean;
  initialStatusFilter?: "all" | "active" | "closed";
}

type Sort = "new" | "total" | "created";
type StatusFilter = "all" | "active" | "closed";

function daysAgo(iso: string, now = Date.now()): { n: number; key: "today" | "yesterday" | "d" } {
  const days = Math.floor((now - new Date(iso).getTime()) / 86400000);
  if (days === 0) return { n: 0, key: "today" };
  if (days === 1) return { n: 1, key: "yesterday" };
  return { n: days, key: "d" };
}

export function JobsListClient({
  jobs,
  appUrl,
  canWrite,
  initialStatusFilter = "all",
}: JobsListClientProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>(initialStatusFilter);
  const [sort, setSort] = useState<Sort>("new");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const { t } = useTranslation();

  const counts = useMemo(() => {
    return {
      all: jobs.length,
      active: jobs.filter((j) => j.status === "active").length,
      closed: jobs.filter((j) => j.status === "closed").length,
    };
  }, [jobs]);

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return jobs
      .filter((j) => (filter === "all" ? true : j.status === filter))
      .filter((j) => (trimmed ? j.title.toLowerCase().includes(trimmed) : true))
      .sort((a, b) => {
        if (sort === "new") return (b.qualified_count ?? 0) - (a.qualified_count ?? 0);
        if (sort === "total") return (b.total_count ?? 0) - (a.total_count ?? 0);
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [jobs, query, filter, sort]);

  const rowPad = density === "compact" ? "py-1.5" : "py-2";

  return (
    <div>
      {/* Page header row */}
      <div className="mb-4 flex items-end justify-between gap-6">
        <div>
          <div className="text-ink-5 mb-1.5 flex items-center gap-1.5 text-[11px] font-medium">
            <span>
              {counts.active} {t("hr.jobs.header.active_suffix")} ·{" "}
              {jobs.reduce((a, j) => a + (j.qualified_count ?? 0), 0)}{" "}
              {t("hr.jobs.header.new_suffix")}
            </span>
          </div>
          <h1 className="text-ink text-[28px] font-semibold leading-[1.1] tracking-[-0.018em]">
            {t("hr.jobs.title")}.
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="border-rule-2 bg-paper shadow-tez-1 flex h-[30px] w-[280px] items-center rounded-[4px] border px-2">
            <Search className="text-ink-5 h-3.5 w-3.5 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("hr.jobs.search")}
              className="flex-1 border-0 bg-transparent px-1.5 text-[12.5px] outline-none"
            />
          </div>
          <button
            type="button"
            className="border-rule-2 bg-paper text-ink-2 shadow-tez-1 hover:bg-bone inline-flex h-[30px] items-center gap-1.5 rounded-[4px] border px-2.5 text-[12.5px] font-medium"
          >
            <Filter className="h-3 w-3" />
            {t("hr.jobs.filter")}
          </button>
          {canWrite ? (
            <Link
              href="/hr/jobs/new"
              className="bg-ink text-paper shadow-tez-1 hover:bg-ink-2 inline-flex h-[30px] items-center gap-1.5 rounded-[4px] px-2.5 text-[12.5px] font-medium"
            >
              <Plus className="h-3 w-3" />
              {t("hr.jobs.create")}
            </Link>
          ) : (
            <button
              type="button"
              disabled
              title={t("quota.subscription_inactive_short")}
              className="bg-ink text-paper inline-flex h-[30px] items-center gap-1.5 rounded-[4px] px-2.5 text-[12.5px] font-medium opacity-60"
            >
              <Lock className="h-3 w-3" />
              {t("hr.jobs.create")}
            </button>
          )}
        </div>
      </div>

      {/* Filter + sort + density row */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Chip
          active={filter === "all"}
          count={counts.all}
          onClick={() => setFilter("all")}
        >
          {t("hr.jobs.filter.all")}
        </Chip>
        <Chip
          active={filter === "active"}
          count={counts.active}
          onClick={() => setFilter("active")}
        >
          {t("hr.job.status.active")}
        </Chip>
        <Chip
          active={filter === "closed"}
          count={counts.closed}
          onClick={() => setFilter("closed")}
        >
          {t("hr.job.status.closed")}
        </Chip>

        <div className="ml-auto flex items-center gap-2.5">
          <span
            className="text-ink-5 text-[10.5px] uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            {t("hr.jobs.sort_label")}
          </span>
          <Seg<Sort>
            value={sort}
            onChange={setSort}
            options={[
              { value: "new", label: t("hr.dashboard.column.new") },
              { value: "total", label: t("hr.dashboard.column.total") },
              { value: "created", label: t("hr.dashboard.column.posted") },
            ]}
          />
          <Seg
            value={density}
            onChange={(v) => setDensity(v)}
            options={[
              { value: "comfortable" as const, label: "≡", title: t("hr.jobs.density.comfortable") },
              { value: "compact" as const, label: "≣", title: t("hr.jobs.density.compact") },
            ]}
          />
        </div>
      </div>

      {/* Table */}
      <Panel>
        {filtered.length === 0 ? (
          <div className="text-ink-5 flex flex-col items-center gap-2.5 px-6 py-12 text-center">
            <Briefcase className="text-ink-6 h-8 w-8" />
            <div className="text-ink-3 text-[13px] font-medium">
              {t("hr.jobs.empty_title")}
            </div>
            <p className="max-w-sm text-[12px]">{t("hr.jobs.empty_body")}</p>
            <Link
              href="/hr/jobs/new"
              className="bg-ink text-paper hover:bg-ink-2 mt-1 inline-flex h-[30px] items-center gap-1.5 rounded-[4px] px-3 text-[12.5px] font-medium"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("hr.jobs.create")}
            </Link>
          </div>
        ) : (
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr>
                <Th style={{ width: 36 }} />
                <Th>{t("hr.jobs.column.title")}</Th>
                <Th>{t("hr.jobs.column.status")}</Th>
                <Th align="right">{t("hr.dashboard.column.new")}</Th>
                <Th align="right">{t("hr.jobs.column.candidates")}</Th>
                <Th align="right">{t("hr.jobs.column.screened_out")}</Th>
                <Th>{t("hr.dashboard.column.posted")}</Th>
                <Th style={{ width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((j) => {
                const posted = daysAgo(j.created_at);
                return (
                  <tr
                    key={j.id}
                    className="border-rule hover:bg-bone border-t transition-colors first:border-t-0"
                  >
                    <td className={cn("pl-3.5", rowPad)}>
                      <div className="border-rule bg-bone-2 grid h-7 w-7 place-items-center rounded-md border">
                        <Briefcase className="text-ink-4 h-3 w-3" />
                      </div>
                    </td>
                    <td className={cn("px-3.5", rowPad)}>
                      <Link
                        href={`/hr/jobs/${j.id}`}
                        className="text-ink text-[12.5px] font-semibold tracking-[-0.008em] hover:underline"
                      >
                        {j.title}
                      </Link>
                    </td>
                    <td className={cn("px-3.5", rowPad)}>
                      <StatusPill
                        status={j.status}
                        label={t(
                          j.status === "active" ? "hr.job.status.active" : "hr.job.status.closed",
                        )}
                      />
                    </td>
                    <td
                      className={cn("px-3.5 text-right", rowPad)}
                      style={{ fontFamily: "var(--font-tez-mono)", fontSize: 11.5 }}
                    >
                      {j.qualified_count > 0 ? (
                        <span className="text-persimmon inline-flex items-center gap-1 font-semibold">
                          <span
                            className="bg-persimmon h-[5px] w-[5px] rounded-full"
                            aria-hidden
                          />
                          {j.qualified_count}
                        </span>
                      ) : (
                        <span className="text-ink-5">—</span>
                      )}
                    </td>
                    <td
                      className={cn("px-3.5 text-right text-ink-2", rowPad)}
                      style={{ fontFamily: "var(--font-tez-mono)", fontSize: 11.5 }}
                    >
                      {j.total_count ?? (j.qualified_count + j.screened_out_count)}
                    </td>
                    <td
                      className={cn("px-3.5 text-right text-ink-2", rowPad)}
                      style={{ fontFamily: "var(--font-tez-mono)", fontSize: 11.5 }}
                    >
                      {j.screened_out_count}
                    </td>
                    <td
                      className={cn("px-3.5 text-ink-5", rowPad)}
                      style={{ fontFamily: "var(--font-tez-mono)", fontSize: 11.5 }}
                    >
                      {posted.key === "today"
                        ? t("hr.time.today")
                        : posted.key === "yesterday"
                          ? t("hr.time.yesterday")
                          : t("hr.time.days_ago", { days: String(posted.n) })}{" "}
                      <span className="text-ink-6 text-[10.5px]">
                        · {format(new Date(j.created_at), "dd.MM.yy")}
                      </span>
                    </td>
                    <td className={cn("pr-3.5 text-right", rowPad)}>
                      <JobActionsDropdown
                        jobId={j.id}
                        token={j.public_token}
                        status={j.status}
                        appUrl={appUrl}
                        canWrite={canWrite}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Panel>

      <div
        className="text-ink-4 mt-2.5 flex justify-between text-[11.5px]"
        style={{ fontFamily: "var(--font-tez-mono)" }}
      >
        <span>
          {filtered.length} / {jobs.length}
        </span>
      </div>
    </div>
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
