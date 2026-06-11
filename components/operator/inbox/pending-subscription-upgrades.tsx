"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CreditCard, ExternalLink, XCircle } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

interface SubscriptionUpgradeRequest {
  id: string;
  companyId: string;
  companyName: string;
  companySlug: string | null;
  requesterId: string;
  requesterLabel: string;
  requesterEmail: string | null;
  planCode: string | null;
  planName: string;
  priceUzs: number | string | null;
  source: string;
  requestNote: string | null;
  createdAt: string;
}

export function PendingSubscriptionUpgrades() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [rows, setRows] = useState<SubscriptionUpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  function formatPrice(value: number | string | null): string {
    if (value === null) return t("operator.upgrades.manual_pro");
    const amount = Number(value);
    if (!Number.isFinite(amount)) return t("operator.upgrades.manual_pro");
    return t("operator.upgrades.uzs_amount", {
      amount: Math.round(amount).toLocaleString("uz-UZ"),
    });
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/subscription-upgrades", { cache: "no-store" });
      if (res.ok) {
        const body = (await res.json()) as { data: SubscriptionUpgradeRequest[] };
        setRows(body.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(`${id}:${decision}`);
    try {
      const res = await fetch(`/api/operator/subscription-upgrades/${id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });

      if (res.ok) {
        toast({
          variant: "success",
          title:
            decision === "approve"
              ? t("operator.upgrades.toast_approved")
              : t("operator.upgrades.toast_rejected"),
        });
        await load();
        return;
      }

      const body = await res.json().catch(() => ({}));
      toast({ variant: "error", title: body?.error ?? t("operator.upgrades.toast_failed") });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-4">
        <div className="h-4 w-48 animate-pulse rounded bg-[var(--color-surface-subtle)]" />
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-success)]/45 bg-[var(--color-surface)]">
      <header className="flex items-center gap-2 border-b border-[var(--color-success)]/25 px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-[var(--color-success)] uppercase">
        <CreditCard className="h-3.5 w-3.5" />
        {t("operator.upgrades.title", { n: String(rows.length) })}
      </header>
      <ul className="divide-y divide-[var(--color-line)]">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-[var(--color-text)]">{r.companyName}</p>
                <span className="rounded-[3px] bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-text-muted)] uppercase">
                  {r.planName}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {t("operator.upgrades.per_month", { price: formatPrice(r.priceUzs) })}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                {t("operator.upgrades.requested_by", {
                  who: r.requesterEmail
                    ? `${r.requesterLabel} (${r.requesterEmail})`
                    : r.requesterLabel,
                  when: new Date(r.createdAt).toLocaleString(),
                })}
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-text-subtle)]">
                {t("operator.upgrades.source", { source: r.source.replaceAll("_", " ") })}
              </p>
              {r.requestNote && (
                <p className="mt-2 text-[12px] text-[var(--color-text-muted)] italic">{r.requestNote}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => decide(r.id, "reject")}
                disabled={busy !== null}
              >
                <XCircle className="h-4 w-4" />
                {t("operator.upgrades.reject")}
              </Button>
              <Button size="sm" onClick={() => decide(r.id, "approve")} disabled={busy !== null}>
                <BadgeCheck className="h-4 w-4" />
                {busy === `${r.id}:approve`
                  ? t("operator.upgrades.approving")
                  : t("operator.upgrades.approve")}
              </Button>
              <Link href={`/operator/companies/${r.companyId}`}>
                <Button size="sm" variant="ghost">
                  <ExternalLink className="h-4 w-4" />
                  {t("operator.upgrades.company")}
                </Button>
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="px-4 py-2 text-[10px] text-[var(--color-text-subtle)]">
        {t("operator.upgrades.footer_note")}
      </p>
    </section>
  );
}
