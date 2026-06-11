"use client";

import { useCallback, useEffect, useState } from "react";
import { Shield, ShieldOff } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

interface Promotion {
  id: number;
  targetUserId: string;
  targetLabel: string;
  proposerUserId: string;
  proposerLabel: string;
  kind: "promote" | "demote";
  reason: string;
  createdAt: string;
}

export function PendingPromotions() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [rows, setRows] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/promotions", { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { data: Promotion[] };
        setRows(j.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: number, decision: "approve" | "reject") {
    const res = await fetch(`/api/operator/promotions/${id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    if (res.ok) {
      toast({
        variant: "success",
        title:
          decision === "approve"
            ? t("operator.promotions.toast_approved")
            : t("operator.promotions.toast_rejected"),
      });
      await load();
    } else {
      const j = await res.json().catch(() => ({}));
      toast({ variant: "error", title: j?.error ?? t("operator.promotions.failed") });
    }
  }

  if (loading) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
      </div>
    );
  }
  if (rows.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-accent)]/40 bg-[var(--color-surface)]">
      <header className="flex items-center gap-2 border-b border-[var(--color-accent)]/30 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-accent-strong)]">
        <Shield className="h-3.5 w-3.5" />
        {t("operator.promotions.title", { n: String(rows.length) })}
      </header>
      <ul className="divide-y divide-[var(--color-line)]">
        {rows.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-3 p-4">
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-[13px] font-medium text-[var(--color-text)]">
                {p.kind === "promote" ? (
                  <Shield className="mr-1 inline h-3.5 w-3.5 text-[var(--color-success)]" />
                ) : (
                  <ShieldOff className="mr-1 inline h-3.5 w-3.5 text-[var(--color-danger)]" />
                )}
                {p.kind === "promote"
                  ? t("operator.promotions.promote")
                  : t("operator.promotions.demote")}{" "}
                {p.targetLabel}
              </p>
              <p className="text-[11px] text-[var(--color-text-muted)]">
                {t("operator.promotions.proposed_by", {
                  by: p.proposerLabel,
                  when: new Date(p.createdAt).toLocaleString(),
                })}
              </p>
              <p className="mt-1 text-[12px] italic text-[var(--color-text-muted)]">“{p.reason}”</p>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => decide(p.id, "reject")}>
                {t("operator.promotions.reject")}
              </Button>
              <Button size="sm" onClick={() => decide(p.id, "approve")}>
                {t("operator.promotions.approve")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="px-4 py-2 text-[10px] text-[var(--color-text-subtle)]">
        {t("operator.promotions.footer_note")}
      </p>
    </section>
  );
}
