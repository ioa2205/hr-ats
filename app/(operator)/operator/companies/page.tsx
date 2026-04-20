"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Building2,
  Copy,
  Download,
  Filter,
  RefreshCw,
  Search,
  UserCog,
  X,
} from "lucide-react";
import { Badge, Button, EmptyState, TooltipProvider } from "@/components/ui";
import { HealthChip } from "@/components/operator/companies/health-chip";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import {
  companyStatusKey,
  planKey,
  subscriptionStatusKey,
} from "@/lib/operator/enum-labels";

type View = "all" | "active" | "trials_expiring" | "suspended" | "at_risk";

interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  default_locale: string;
  created_at: string;
  health_score: number | null;
  subscriptions: { status: string; plan: string | null; trial_ends_at: string | null }[] | null;
  company_members: { count: number }[] | null;
}

const VIEWS: Array<{ id: View; labelKey: TranslationKey }> = [
  { id: "all", labelKey: "operator.companies.view.all" },
  { id: "active", labelKey: "operator.companies.view.active" },
  { id: "trials_expiring", labelKey: "operator.companies.view.trials_expiring" },
  { id: "suspended", labelKey: "operator.companies.view.suspended" },
  { id: "at_risk", labelKey: "operator.companies.view.at_risk" },
];

export default function OperatorCompaniesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const [view, setView] = useState<View>((searchParams.get("view") as View) || "all");
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [plan, setPlan] = useState<"all" | "trial" | "pro">(
    (searchParams.get("plan") as "all" | "trial" | "pro") || "all",
  );
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(Number(searchParams.get("page") ?? "1"));
  const [data, setData] = useState<CompanyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetch$ = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      qs.set("view", view);
      qs.set("plan", plan);
      qs.set("page", String(page));
      if (search) qs.set("search", search);
      const res = await fetch(`/api/operator/companies?${qs.toString()}`);
      if (!res.ok) return;
      const j = (await res.json()) as { data: CompanyRow[]; total: number };
      setData(j.data ?? []);
      setTotal(j.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [view, plan, page, search]);

  useEffect(() => {
    void fetch$();
  }, [fetch$]);

  // Sync URL (shallow) so state is bookmarkable.
  useEffect(() => {
    const qs = new URLSearchParams();
    if (view !== "all") qs.set("view", view);
    if (plan !== "all") qs.set("plan", plan);
    if (search) qs.set("search", search);
    if (page > 1) qs.set("page", String(page));
    const next = qs.toString();
    window.history.replaceState(null, "", next ? `?${next}` : window.location.pathname);
  }, [view, plan, search, page]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  const exportHref = useMemo(() => {
    const qs = new URLSearchParams();
    if (view === "active" || view === "suspended") qs.set("status", view);
    if (search) qs.set("search", search);
    return `/api/operator/companies/export?${qs.toString()}`;
  }, [view, search]);

  return (
    <TooltipProvider>
      <div className="flex flex-col gap-4 font-[var(--font-tez-sans)]">
        <header className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
              {t("admin.nav.companies")}
            </p>
            <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-ink)]">
              {t("operator.companies.title")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={exportHref}
              className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] px-2.5 text-[11px] font-medium text-[var(--color-ink-3)] hover:bg-[var(--color-bone-2)]"
            >
              <Download className="h-3.5 w-3.5" />
              {t("operator.companies.export")}
            </a>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void fetch$()}
              aria-label={t("admin.refresh")}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("admin.refresh")}
            </Button>
          </div>
        </header>

        {/* Saved views */}
        <nav className="flex items-center gap-1 overflow-x-auto border-b border-[var(--color-rule)] pb-1">
          {VIEWS.map((v) => {
            const active = view === v.id;
            return (
              <button
                key={v.id}
                onClick={() => {
                  setView(v.id);
                  setPage(1);
                }}
                className={`whitespace-nowrap rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] font-medium transition-colors ${
                  active
                    ? "bg-[var(--color-ink)] text-[var(--color-bone)]"
                    : "text-[var(--color-ink-4)] hover:bg-[var(--color-bone-2)] hover:text-[var(--color-ink)]"
                }`}
              >
                {t(v.labelKey)}
              </button>
            );
          })}
        </nav>

        {/* Search + filter toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-ink-4)]" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("operator.companies.search_placeholder")}
              className="h-8 w-full rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] pl-8 pr-2 text-[12px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-5)] focus:border-[var(--color-ink-4)] focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="flex h-8 items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] px-2.5 text-[11px] font-medium text-[var(--color-ink-3)] hover:bg-[var(--color-bone-2)]"
          >
            <Filter className="h-3.5 w-3.5" />
            {t("operator.companies.filters")}
          </button>
          <div className="nums font-[var(--font-tez-mono)] text-[11px] text-[var(--color-ink-5)]">
            {total.toLocaleString()} {t("operator.companies.count_suffix")}
          </div>
        </div>

        {showFilters && (
          <div className="grid grid-cols-1 gap-3 rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] p-3 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-[11px]">
              <span className="font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-4)]">
                {t("operator.companies.plan")}
              </span>
              <select
                value={plan}
                onChange={(e) => {
                  setPlan(e.target.value as "all" | "trial" | "pro");
                  setPage(1);
                }}
                className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-bone)] px-2 text-[12px] text-[var(--color-ink)]"
              >
                <option value="all">{t("operator.companies.plan_all")}</option>
                <option value="trial">{t("operator.enum.plan.trial")}</option>
                <option value="pro">{t("operator.enum.plan.pro")}</option>
              </select>
            </label>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-bone-2)]"
              />
            ))}
          </div>
        ) : data.length === 0 ? (
          <EmptyState
            icon={<Building2 />}
            title={
              view === "at_risk"
                ? t("operator.companies.view.at_risk")
                : t("admin.companies.empty")
            }
            description={t("admin.companies.empty_description")}
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)]">
            <table className="w-full text-[12px]">
              <thead className="border-b border-[var(--color-rule)] bg-[var(--color-bone)]">
                <tr className="text-left text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--color-ink-4)]">
                  <th className="px-3 py-2">{t("operator.companies.col.company")}</th>
                  <th className="px-3 py-2">{t("operator.companies.col.status")}</th>
                  <th className="px-3 py-2">{t("operator.companies.col.health")}</th>
                  <th className="px-3 py-2 text-right">{t("operator.companies.col.members")}</th>
                  <th className="px-3 py-2">{t("operator.companies.col.plan")}</th>
                  <th className="px-3 py-2 text-right">{t("operator.companies.col.created")}</th>
                  <th className="w-0 px-3 py-2" aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {data.map((c) => {
                  const sub = c.subscriptions?.[0];
                  const memberCount = c.company_members?.[0]?.count ?? 0;
                  return (
                    <tr
                      key={c.id}
                      className="group border-b border-[var(--color-rule)] last:border-0 hover:bg-[var(--color-bone-2)]"
                    >
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/operator/companies/${c.id}`}
                          className="font-medium text-[var(--color-ink)] hover:underline"
                        >
                          {c.name}
                        </Link>
                        <div className="font-[var(--font-tez-mono)] text-[10px] text-[var(--color-ink-5)]">
                          {c.slug}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <Badge
                          tone={c.status === "active" ? "success" : "danger"}
                          variant="dot"
                          size="sm"
                        >
                          {t(companyStatusKey(c.status))}
                        </Badge>
                      </td>
                      <td className="px-3 py-1.5">
                        <HealthChip score={c.health_score} />
                      </td>
                      <td className="nums px-3 py-1.5 text-right font-[var(--font-tez-mono)] text-[var(--color-ink-3)]">
                        {memberCount}
                      </td>
                      <td className="px-3 py-1.5">
                        {sub ? (
                          <span className="text-[11px] text-[var(--color-ink-3)]">
                            <span className="font-medium">{t(planKey(sub.plan))}</span>
                            <span className="ml-1 text-[var(--color-ink-5)]">
                              ({t(subscriptionStatusKey(sub.status))})
                            </span>
                          </span>
                        ) : (
                          <span className="text-[var(--color-ink-5)]">—</span>
                        )}
                      </td>
                      <td className="nums px-3 py-1.5 text-right font-[var(--font-tez-mono)] text-[10px] text-[var(--color-ink-5)]">
                        {new Date(c.created_at).toISOString().slice(0, 10)}
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <RowAction
                            label={t("operator.companies.row.open")}
                            onClick={() => router.push(`/operator/companies/${c.id}`)}
                          >
                            <ArrowRight className="h-3.5 w-3.5" />
                          </RowAction>
                          <RowAction
                            label={t("operator.companies.row.impersonate")}
                            onClick={() =>
                              router.push(`/operator/companies/${c.id}#members`)
                            }
                          >
                            <UserCog className="h-3.5 w-3.5" />
                          </RowAction>
                          <RowAction
                            label={t("operator.companies.row.copy_id")}
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(c.id);
                              } catch {
                                /* noop */
                              }
                            }}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </RowAction>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[var(--color-ink-4)]">
              {t("operator.companies.page_of", {
                page: String(page),
                total: String(totalPages),
              })}
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <X className="hidden" />
                {t("common.previous")}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("common.next")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function RowAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-ink-4)] hover:bg-[var(--color-bone-3)] hover:text-[var(--color-ink)]"
    >
      {children}
    </button>
  );
}
