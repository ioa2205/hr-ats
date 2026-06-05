"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { BadgeCheck, CreditCard, ExternalLink, XCircle } from "lucide-react";
import { Button, useToast } from "@/components/ui";

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

function formatUzs(value: number | string | null): string {
  if (value === null) return "manual Pro";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "manual Pro";
  return `${Math.round(amount).toLocaleString("uz-UZ")} UZS`;
}

export function PendingSubscriptionUpgrades() {
  const { toast } = useToast();
  const [rows, setRows] = useState<SubscriptionUpgradeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

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
          title: decision === "approve" ? "Pro activated" : "Upgrade request rejected",
        });
        await load();
        return;
      }

      const body = await res.json().catch(() => ({}));
      toast({ variant: "error", title: body?.error ?? "Decision failed" });
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] p-4">
        <div className="h-4 w-48 animate-pulse rounded bg-[var(--color-bone-2)]" />
      </div>
    );
  }

  if (rows.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-tez-green)]/45 bg-[var(--color-paper)]">
      <header className="flex items-center gap-2 border-b border-[var(--color-tez-green)]/25 px-4 py-2.5 text-[11px] font-semibold tracking-[0.08em] text-[var(--color-tez-green)] uppercase">
        <CreditCard className="h-3.5 w-3.5" />
        Pro upgrade requests ({rows.length})
      </header>
      <ul className="divide-y divide-[var(--color-rule)]">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex flex-col gap-3 p-4 lg:flex-row lg:items-start lg:justify-between"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[13px] font-semibold text-[var(--color-ink)]">{r.companyName}</p>
                <span className="rounded-[3px] bg-[var(--color-bone-2)] px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-ink-4)] uppercase">
                  {r.planName}
                </span>
                <span className="text-[11px] text-[var(--color-ink-4)]">
                  {formatUzs(r.priceUzs)} / month
                </span>
              </div>
              <p className="mt-1 text-[11px] text-[var(--color-ink-4)]">
                Requested by {r.requesterLabel}
                {r.requesterEmail ? ` (${r.requesterEmail})` : ""} ·{" "}
                {new Date(r.createdAt).toLocaleString()}
              </p>
              <p className="mt-1 text-[11px] text-[var(--color-ink-5)]">
                Source: {r.source.replaceAll("_", " ")}
              </p>
              {r.requestNote && (
                <p className="mt-2 text-[12px] text-[var(--color-ink-3)] italic">{r.requestNote}</p>
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
                Reject
              </Button>
              <Button size="sm" onClick={() => decide(r.id, "approve")} disabled={busy !== null}>
                <BadgeCheck className="h-4 w-4" />
                {busy === `${r.id}:approve` ? "Activating..." : "Approve Pro"}
              </Button>
              <Link href={`/operator/companies/${r.companyId}`}>
                <Button size="sm" variant="ghost">
                  <ExternalLink className="h-4 w-4" />
                  Company
                </Button>
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <p className="px-4 py-2 text-[10px] text-[var(--color-ink-5)]">
        Approval activates Pro immediately for the company. Payment collection can be handled
        manually until Click/Payme credentials are ready.
      </p>
    </section>
  );
}
