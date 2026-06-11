"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import type { AuditLogEntry } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";

export default function OperatorAuditPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAudit = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/audit?limit=100");
      if (res.ok) {
        const data = await res.json();
        setRows(data.data ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit();
  }, [fetchAudit]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-[var(--color-text)] text-2xl font-semibold">{t("operator.audit.title")}</h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchAudit}
          aria-label={t("operator.audit.refresh")}
        >
          <RefreshCw className="h-4 w-4" />
          {t("operator.audit.refresh")}
        </Button>
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
          {t("operator.audit.empty")}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("operator.audit.col.time")}</TableHead>
              <TableHead>{t("operator.audit.col.company")}</TableHead>
              <TableHead>{t("operator.audit.col.actor")}</TableHead>
              <TableHead>{t("operator.audit.col.action")}</TableHead>
              <TableHead>{t("operator.audit.col.entity")}</TableHead>
              <TableHead>{t("operator.audit.col.metadata")}</TableHead>
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
                    second: "2-digit",
                  })}
                </TableCell>
                <TableCell className="text-[var(--color-text-muted)] text-xs">
                  {row.company_id ? row.company_id.slice(0, 8) : "—"}
                </TableCell>
                <TableCell className="text-xs">{row.actor}</TableCell>
                <TableCell>
                  <code className="bg-[var(--color-surface-subtle)] rounded px-1.5 py-0.5 text-xs">
                    {row.action}
                  </code>
                </TableCell>
                <TableCell className="text-xs">
                  {row.entity_type}
                  {row.entity_id && (
                    <span className="text-[var(--color-text-muted)] ml-1">
                      #{row.entity_id.slice(0, 8)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="max-w-[300px]">
                  {row.metadata ? (
                    <pre className="text-[var(--color-text-muted)] max-h-20 overflow-auto text-xs whitespace-pre-wrap">
                      {JSON.stringify(row.metadata, null, 2)}
                    </pre>
                  ) : (
                    <span className="text-[var(--color-text-muted)] text-xs">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
