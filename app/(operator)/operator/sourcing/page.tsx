"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import { HhPlatformConnectionCard } from "@/components/operator/hh-platform-connection-card";
import type { TranslationKey } from "@/lib/i18n/types";
import type { RunsSummary } from "@/lib/sourcing/summary";
import type { SourceKind, SourcingStats, SourcingStatus } from "@/lib/sourcing/types";

interface SourcingRow {
  id: string;
  created_at: string;
  completed_at: string | null;
  status: SourcingStatus;
  sources: SourceKind[];
  stats: Partial<SourcingStats> | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | string | null;
  error: string | null;
  job_posting: {
    title: string;
    company: { name: string } | null;
  } | null;
}

const statusToneMap: Record<SourcingStatus, "success" | "danger" | "warning" | "neutral"> = {
  completed: "success",
  partial: "warning",
  failed: "danger",
  running: "neutral",
  queued: "neutral",
};

const statusKey: Record<SourcingStatus, TranslationKey> = {
  queued: "sourcing.results.status.queued",
  running: "sourcing.results.status.running",
  completed: "sourcing.results.status.completed",
  partial: "sourcing.results.status.partial",
  failed: "sourcing.results.status.failed",
};

const sourceKey: Record<SourceKind, TranslationKey> = {
  internal_pool: "sourcing.results.source.internal_pool",
  hh: "sourcing.results.source.hh",
  telegram: "sourcing.results.source.telegram",
  linkedin_url: "sourcing.results.source.linkedin_url",
};

function num(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

function rowIssue(row: SourcingRow): string | null {
  if (row.error) return row.error;
  const detail = row.stats?.degraded_details?.[0];
  if (!detail) return null;
  return [
    detail.source,
    detail.status ? String(detail.status) : null,
    detail.code ?? null,
    detail.message,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function OperatorSourcingPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<SourcingRow[]>([]);
  const [summary, setSummary] = useState<RunsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/operator/sourcing?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows ?? []);
        setSummary(data.summary ?? null);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const tiles: Array<{ labelKey: TranslationKey; value: string }> = summary
    ? [
        { labelKey: "operator.sourcing.tile.runs", value: String(summary.total) },
        { labelKey: "operator.sourcing.tile.completed", value: String(summary.byStatus.completed) },
        { labelKey: "operator.sourcing.tile.partial", value: String(summary.byStatus.partial) },
        { labelKey: "operator.sourcing.tile.failed", value: String(summary.byStatus.failed) },
        {
          labelKey: "operator.sourcing.tile.tokens",
          value: (summary.totalInputTokens + summary.totalOutputTokens).toLocaleString(),
        },
        { labelKey: "operator.sourcing.tile.cost", value: `$${summary.totalCostUsd.toFixed(4)}` },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-on-surface text-2xl font-semibold">{t("operator.sourcing.title")}</h1>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40" aria-label={t("admin.processing.filter_label")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("operator.processing.filter.all")}</SelectItem>
              <SelectItem value="completed">{t("sourcing.results.status.completed")}</SelectItem>
              <SelectItem value="partial">{t("sourcing.results.status.partial")}</SelectItem>
              <SelectItem value="failed">{t("sourcing.results.status.failed")}</SelectItem>
              <SelectItem value="running">{t("sourcing.results.status.running")}</SelectItem>
              <SelectItem value="queued">{t("sourcing.results.status.queued")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" onClick={fetchData} aria-label={t("admin.refresh")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-on-surface-variant -mt-3 text-sm">{t("operator.sourcing.subtitle")}</p>

      <HhPlatformConnectionCard />

      {!loading && summary && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-6">
          {tiles.map((tile) => (
            <div
              key={tile.labelKey}
              className="bg-surface-container rounded-[var(--radius-md)] px-3 py-2.5"
            >
              <div className="text-on-surface-variant text-[11px] font-medium">
                {t(tile.labelKey)}
              </div>
              <div className="nums text-on-surface mt-0.5 text-lg font-semibold">{tile.value}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-surface-container h-12 w-full animate-pulse rounded-[var(--radius-md)]"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-on-surface-variant py-8 text-center text-sm">
          {t("operator.sourcing.empty")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("operator.processing.col.time")}</TableHead>
              <TableHead>{t("operator.processing.col.company")}</TableHead>
              <TableHead>{t("operator.processing.col.job")}</TableHead>
              <TableHead>{t("operator.sourcing.col.sources")}</TableHead>
              <TableHead>{t("operator.processing.col.status")}</TableHead>
              <TableHead>{t("operator.sourcing.col.funnel")}</TableHead>
              <TableHead>{t("operator.processing.col.tokens")}</TableHead>
              <TableHead>{t("operator.processing.col.cost")}</TableHead>
              <TableHead>{t("operator.processing.col.error")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const issue = rowIssue(row);
              row.error = issue;
              return (
              <TableRow key={row.id}>
                <TableCell className="nums text-xs whitespace-nowrap">
                  {new Date(row.created_at).toLocaleString(undefined, {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TableCell>
                <TableCell className="max-w-[140px] truncate">
                  {row.job_posting?.company?.name ?? "—"}
                </TableCell>
                <TableCell className="max-w-[160px] truncate">
                  {row.job_posting?.title ?? "—"}
                </TableCell>
                <TableCell className="max-w-[140px] truncate text-xs">
                  {(row.sources ?? []).map((s) => t(sourceKey[s])).join(", ") || "—"}
                </TableCell>
                <TableCell>
                  <Badge tone={statusToneMap[row.status]} size="sm">
                    {t(statusKey[row.status])}
                  </Badge>
                </TableCell>
                <TableCell className="nums text-xs whitespace-nowrap">
                  {`${row.stats?.fetched ?? 0}→${row.stats?.shortlisted ?? 0}`}
                </TableCell>
                <TableCell className="nums text-xs">
                  {`${num(row.input_tokens)}/${num(row.output_tokens)}`}
                </TableCell>
                <TableCell className="nums text-xs">{`$${num(row.cost_usd).toFixed(4)}`}</TableCell>
                <TableCell
                  className="text-danger max-w-[200px] truncate text-xs"
                  title={issue ?? undefined}
                >
                  {row.error ? row.error.slice(0, 100) : "—"}
                </TableCell>
              </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
