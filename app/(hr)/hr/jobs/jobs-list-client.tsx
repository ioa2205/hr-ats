"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Lock, Briefcase, Rows3, Rows2 } from "lucide-react";
import { format } from "date-fns";
import { JobActionsDropdown } from "@/components/hr/job-actions-dropdown";
import {
  Panel,
  Button,
  Badge,
  SearchField,
  FilterChip,
  SegmentedControl,
  EmptyState,
} from "@/components/ui";
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
type Density = "comfortable" | "compact";

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
  const [density, setDensity] = useState<Density>("comfortable");
  const { t } = useTranslation();

  const counts = useMemo(
    () => ({
      all: jobs.length,
      active: jobs.filter((j) => j.status === "active").length,
      closed: jobs.filter((j) => j.status === "closed").length,
    }),
    [jobs],
  );

  const totalNew = useMemo(
    () => jobs.reduce((a, j) => a + (j.qualified_count ?? 0), 0),
    [jobs],
  );

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

  const rowPad = density === "compact" ? "py-1.5" : "py-2.5";

  function postedLabel(iso: string) {
    const posted = daysAgo(iso);
    return posted.key === "today"
      ? t("hr.time.today")
      : posted.key === "yesterday"
        ? t("hr.time.yesterday")
        : t("hr.time.days_ago", { days: String(posted.n) });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="mb-1.5 font-[var(--font-mono)] text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
            {counts.active} {t("hr.jobs.header.active_suffix")} · {totalNew}{" "}
            {t("hr.jobs.header.new_suffix")}
          </p>
          <h1 className="text-[clamp(1.5rem,4vw,1.85rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
            {t("hr.jobs.title")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <SearchField
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            clearLabel={t("common.clear")}
            placeholder={t("hr.jobs.search")}
            aria-label={t("hr.jobs.search")}
            className="w-full sm:w-[260px]"
          />
          {canWrite ? (
            <Button asChild className="shrink-0">
              <Link href="/hr/jobs/new">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t("hr.jobs.create")}</span>
              </Link>
            </Button>
          ) : (
            <Button
              disabled
              className="shrink-0"
              title={t("quota.subscription_inactive_short")}
            >
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">{t("hr.jobs.create")}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filter + sort + density */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 py-0.5">
          <FilterChip active={filter === "all"} count={counts.all} onClick={() => setFilter("all")}>
            {t("hr.jobs.filter.all")}
          </FilterChip>
          <FilterChip
            active={filter === "active"}
            count={counts.active}
            onClick={() => setFilter("active")}
          >
            {t("hr.job.status.active")}
          </FilterChip>
          <FilterChip
            active={filter === "closed"}
            count={counts.closed}
            onClick={() => setFilter("closed")}
          >
            {t("hr.job.status.closed")}
          </FilterChip>
        </div>

        <div className="ml-auto flex items-center gap-2.5">
          <span className="hidden font-[var(--font-mono)] text-[10.5px] tracking-[0.08em] text-[var(--color-text-subtle)] uppercase sm:inline">
            {t("hr.jobs.sort_label")}
          </span>
          <SegmentedControl<Sort>
            size="sm"
            value={sort}
            onChange={setSort}
            aria-label={t("hr.jobs.sort_label")}
            options={[
              { value: "new", label: t("hr.dashboard.column.new") },
              { value: "total", label: t("hr.dashboard.column.total") },
              { value: "created", label: t("hr.dashboard.column.posted") },
            ]}
          />
          <div className="hidden sm:block">
            <SegmentedControl<Density>
              size="sm"
              value={density}
              onChange={setDensity}
              aria-label={t("hr.jobs.density.comfortable")}
              options={[
                {
                  value: "comfortable",
                  label: <Rows3 className="h-3.5 w-3.5" />,
                  ariaLabel: t("hr.jobs.density.comfortable"),
                },
                {
                  value: "compact",
                  label: <Rows2 className="h-3.5 w-3.5" />,
                  ariaLabel: t("hr.jobs.density.compact"),
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <Panel>
          <EmptyState
            icon={<Briefcase />}
            title={t("hr.jobs.empty_title")}
            description={t("hr.jobs.empty_body")}
            action={
              canWrite ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href="/hr/jobs/new">
                    <Plus className="h-3.5 w-3.5" />
                    {t("hr.jobs.create")}
                  </Link>
                </Button>
              ) : undefined
            }
          />
        </Panel>
      ) : (
        <>
          {/* Desktop / tablet table */}
          <Panel className="hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-line)]">
                    <Th className="w-9" />
                    <Th>{t("hr.jobs.column.title")}</Th>
                    <Th>{t("hr.jobs.column.status")}</Th>
                    <Th align="right">{t("hr.dashboard.column.new")}</Th>
                    <Th align="right">{t("hr.jobs.column.candidates")}</Th>
                    <Th align="right">{t("hr.jobs.column.screened_out")}</Th>
                    <Th>{t("hr.dashboard.column.posted")}</Th>
                    <Th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((j) => (
                    <tr
                      key={j.id}
                      className="border-b border-[var(--color-line)] transition-colors last:border-0 hover:bg-[var(--color-surface-subtle)]"
                    >
                      <td className={cn("pl-4", rowPad)}>
                        <span className="grid h-7 w-7 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-surface-strong)] text-[var(--color-text-subtle)]">
                          <Briefcase className="h-3.5 w-3.5" />
                        </span>
                      </td>
                      <td className={cn("px-3", rowPad)}>
                        <div className="max-w-[clamp(160px,32vw,440px)] truncate">
                          <Link
                            href={`/hr/jobs/${j.id}`}
                            className="font-semibold tracking-[-0.008em] text-[var(--color-text)] hover:text-[var(--color-primary)]"
                          >
                            {j.title}
                          </Link>
                        </div>
                      </td>
                      <td className={cn("px-3", rowPad)}>
                        <Badge
                          tone={j.status === "active" ? "success" : "neutral"}
                          variant={j.status === "active" ? "dot" : "default"}
                        >
                          {t(j.status === "active" ? "hr.job.status.active" : "hr.job.status.closed")}
                        </Badge>
                      </td>
                      <td className={cn("px-3 text-right font-[var(--font-mono)] text-[11.5px]", rowPad)}>
                        {j.qualified_count > 0 ? (
                          <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-accent)]">
                            <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-accent)]" aria-hidden />
                            {j.qualified_count}
                          </span>
                        ) : (
                          <span className="text-[var(--color-text-subtle)]">—</span>
                        )}
                      </td>
                      <td className={cn("px-3 text-right font-[var(--font-mono)] text-[11.5px] text-[var(--color-text)]", rowPad)}>
                        {j.total_count ?? j.qualified_count + j.screened_out_count}
                      </td>
                      <td className={cn("px-3 text-right font-[var(--font-mono)] text-[11.5px] text-[var(--color-text-muted)]", rowPad)}>
                        {j.screened_out_count}
                      </td>
                      <td className={cn("px-3 font-[var(--font-mono)] text-[11.5px] text-[var(--color-text-subtle)]", rowPad)}>
                        <span className="whitespace-nowrap">{postedLabel(j.created_at)}</span>{" "}
                        <span className="whitespace-nowrap text-[10.5px] opacity-70">
                          · {format(new Date(j.created_at), "dd.MM.yy")}
                        </span>
                      </td>
                      <td className={cn("pr-3 text-right", rowPad)}>
                        <JobActionsDropdown
                          jobId={j.id}
                          token={j.public_token}
                          status={j.status}
                          appUrl={appUrl}
                          canWrite={canWrite}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Mobile cards */}
          <ul className="flex flex-col gap-2.5 sm:hidden">
            {filtered.map((j) => (
              <li
                key={j.id}
                className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/hr/jobs/${j.id}`}
                    className="min-w-0 flex-1 text-[14px] font-semibold tracking-[-0.008em] text-[var(--color-text)]"
                  >
                    {j.title}
                  </Link>
                  <JobActionsDropdown
                    jobId={j.id}
                    token={j.public_token}
                    status={j.status}
                    appUrl={appUrl}
                    canWrite={canWrite}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    tone={j.status === "active" ? "success" : "neutral"}
                    variant={j.status === "active" ? "dot" : "default"}
                  >
                    {t(j.status === "active" ? "hr.job.status.active" : "hr.job.status.closed")}
                  </Badge>
                  {j.qualified_count > 0 && (
                    <Badge tone="accent" variant="dot">
                      {j.qualified_count} {t("hr.dashboard.column.new").toLowerCase()}
                    </Badge>
                  )}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 font-[var(--font-mono)] text-[11px] text-[var(--color-text-muted)]">
                  <CardStat
                    label={t("hr.jobs.column.candidates")}
                    value={String(j.total_count ?? j.qualified_count + j.screened_out_count)}
                  />
                  <CardStat label={t("hr.jobs.column.screened_out")} value={String(j.screened_out_count)} />
                  <CardStat label={t("hr.dashboard.column.posted")} value={postedLabel(j.created_at)} />
                </div>
              </li>
            ))}
          </ul>

          <p className="font-[var(--font-mono)] text-[11.5px] text-[var(--color-text-muted)]">
            {filtered.length} / {jobs.length}
          </p>
        </>
      )}
    </div>
  );
}

function Th({
  children,
  align = "left",
  className,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-[11px] font-semibold text-[var(--color-text-muted)]",
        className,
      )}
      style={{ textAlign: align }}
    >
      {children}
    </th>
  );
}

function CardStat({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[var(--color-text-subtle)]">{label}</span>
      <span className="text-[var(--color-text)]">{value}</span>
    </span>
  );
}
