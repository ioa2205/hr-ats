"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import type { JobPosting } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";
import { jobStatusKey } from "@/lib/operator/enum-labels";

interface PostingRow extends JobPosting {
  candidates: { count: number }[];
  company: { id: string; name: string } | null;
}

export default function OperatorPostingsPage() {
  const { t } = useTranslation();
  const [rows, setRows] = useState<PostingRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPostings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/postings");
      if (res.ok) {
        const data = await res.json();
        setRows(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPostings();
  }, [fetchPostings]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-on-surface text-2xl font-semibold">{t("admin.postings.title")}</h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={fetchPostings}
          aria-label={t("admin.refresh")}
        >
          <RefreshCw className="h-4 w-4" />
          {t("admin.refresh")}
        </Button>
      </div>

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
        <p className="text-on-surface-variant py-8 text-center text-sm">{t("admin.postings.empty")}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("operator.postings.col.title")}</TableHead>
              <TableHead>{t("operator.postings.col.company")}</TableHead>
              <TableHead>{t("operator.postings.col.status")}</TableHead>
              <TableHead>{t("operator.postings.col.candidates")}</TableHead>
              <TableHead>{t("operator.postings.col.created")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const candidateCount = row.candidates?.[0]?.count ?? 0;
              return (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell>
                    {row.company ? (
                      <Link
                        href={`/operator/companies/${row.company.id}`}
                        className="text-primary hover:underline"
                      >
                        {row.company.name}
                      </Link>
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge
                      tone={row.status === "active" ? "success" : "neutral"}
                      variant="dot"
                      size="sm"
                    >
                      {t(jobStatusKey(row.status))}
                    </Badge>
                  </TableCell>
                  <TableCell className="nums">{candidateCount}</TableCell>
                  <TableCell className="text-on-surface-variant text-xs">
                    {new Date(row.created_at).toLocaleDateString()}
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
