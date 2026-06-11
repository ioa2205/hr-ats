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
import type { AiAttemptStatus } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";
import { processingStatusKey } from "@/lib/operator/enum-labels";

interface ProcessingRow {
  id: string;
  created_at: string;
  status: AiAttemptStatus;
  prompt_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  duration_ms: number | null;
  error: string | null;
  candidate: {
    full_name: string;
    job_posting: {
      title: string;
      company: { name: string } | null;
    } | null;
  } | null;
}

const statusToneMap: Record<AiAttemptStatus, "success" | "danger" | "warning" | "neutral"> = {
  success: "success",
  failed: "danger",
  rate_limited: "warning",
  timeout: "warning",
};

export default function OperatorProcessingPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ProcessingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("status", filter);
      const res = await fetch(`/api/operator/processing?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRows(data);
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[var(--color-text)] text-2xl font-semibold">{t("admin.processing_log")}</h1>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40" aria-label={t("admin.processing.filter_label")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("operator.processing.filter.all")}</SelectItem>
              <SelectItem value="success">{t("operator.processing.filter.success")}</SelectItem>
              <SelectItem value="failed">{t("operator.processing.filter.failed")}</SelectItem>
              <SelectItem value="rate_limited">
                {t("operator.processing.filter.rate_limited")}
              </SelectItem>
              <SelectItem value="timeout">{t("operator.processing.filter.timeout")}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="secondary" size="sm" onClick={fetchData} aria-label={t("admin.refresh")}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-[var(--color-surface-subtle)] h-12 w-full animate-pulse rounded-[var(--radius-md)]"
            />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[var(--color-text-muted)] py-8 text-center text-sm">
          {t("operator.processing.empty")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("operator.processing.col.time")}</TableHead>
              <TableHead>{t("operator.processing.col.candidate")}</TableHead>
              <TableHead>{t("operator.processing.col.company")}</TableHead>
              <TableHead>{t("operator.processing.col.job")}</TableHead>
              <TableHead>{t("operator.processing.col.status")}</TableHead>
              <TableHead>{t("operator.processing.col.tokens")}</TableHead>
              <TableHead>{t("operator.processing.col.cost")}</TableHead>
              <TableHead>{t("operator.processing.col.duration")}</TableHead>
              <TableHead>{t("operator.processing.col.error")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
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
                  {row.candidate?.full_name ?? "—"}
                </TableCell>
                <TableCell className="max-w-[140px] truncate">
                  {row.candidate?.job_posting?.company?.name ?? "—"}
                </TableCell>
                <TableCell className="max-w-[140px] truncate">
                  {row.candidate?.job_posting?.title ?? "—"}
                </TableCell>
                <TableCell>
                  <Badge tone={statusToneMap[row.status]} size="sm">
                    {t(processingStatusKey(row.status))}
                  </Badge>
                </TableCell>
                <TableCell className="nums text-xs">
                  {row.prompt_tokens != null && row.output_tokens != null
                    ? `${row.prompt_tokens}/${row.output_tokens}`
                    : "—"}
                </TableCell>
                <TableCell className="nums text-xs">
                  {row.cost_usd != null ? `$${row.cost_usd.toFixed(4)}` : "—"}
                </TableCell>
                <TableCell className="nums text-xs">
                  {row.duration_ms != null ? `${(row.duration_ms / 1000).toFixed(1)}s` : "—"}
                </TableCell>
                <TableCell
                  className="text-danger max-w-[200px] truncate text-xs"
                  title={row.error ?? undefined}
                >
                  {row.error ? row.error.slice(0, 100) : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
