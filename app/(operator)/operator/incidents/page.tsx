"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { severityKey, incidentStatusKey } from "@/lib/operator/enum-labels";

type Status = "firing" | "acknowledged" | "resolved";
type Tab = Status | "all";

interface Incident {
  id: number;
  rule_id: string;
  severity: "info" | "warn" | "critical";
  target_type: string | null;
  target_id: string | null;
  target_label: string | null;
  summary: string;
  status: Status;
  first_fired_at: string;
  last_fired_at: string;
  ack_at: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
}

const TAB_KEYS: Record<Tab, TranslationKey> = {
  firing: "operator.incidents.tab.firing",
  acknowledged: "operator.incidents.tab.acknowledged",
  resolved: "operator.incidents.tab.resolved",
  all: "operator.incidents.tab.all",
};

export default function IncidentsPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("firing");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveFor, setResolveFor] = useState<Incident | null>(null);
  const [resolveNote, setResolveNote] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/operator/incidents?status=${tab}&limit=200`, {
        cache: "no-store",
      });
      if (res.ok) {
        const j = (await res.json()) as { data: Incident[] };
        setIncidents(j.data);
      }
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void load();
  }, [load]);

  async function ack(id: number) {
    const res = await fetch(`/api/operator/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "acknowledge" }),
    });
    if (res.ok) {
      toast({ variant: "success", title: t("operator.incidents.toast_ack") });
      await load();
    }
  }

  async function resolve(id: number, note: string) {
    if (note.trim().length === 0) {
      toast({ variant: "error", title: t("operator.incidents.note_required") });
      return;
    }
    const res = await fetch(`/api/operator/incidents/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", note }),
    });
    if (res.ok) {
      toast({ variant: "success", title: t("operator.incidents.toast_resolved") });
      setResolveFor(null);
      setResolveNote("");
      await load();
    }
  }

  const tabs = useMemo<Tab[]>(() => ["firing", "acknowledged", "resolved", "all"], []);

  return (
    <div className="flex flex-col gap-4 font-[var(--font-tez-sans)]">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
            {t("operator.incidents.eyebrow")}
          </p>
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-ink)]">
            {t("operator.incidents.title")}
          </h1>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-3.5 w-3.5" />
          {t("admin.refresh")}
        </Button>
      </header>

      <nav className="flex items-center gap-1 overflow-x-auto border-b border-[var(--color-rule)] pb-1">
        {tabs.map((id) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`whitespace-nowrap rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] font-medium transition-colors ${
                active
                  ? "bg-[var(--color-ink)] text-[var(--color-bone)]"
                  : "text-[var(--color-ink-4)] hover:bg-[var(--color-bone-2)] hover:text-[var(--color-ink)]"
              }`}
            >
              {t(TAB_KEYS[id])}
            </button>
          );
        })}
      </nav>

      {loading ? (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-bone-2)]"
            />
          ))}
        </div>
      ) : incidents.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] p-10">
          <CheckCircle2 className="h-8 w-8 text-[var(--color-tez-green)]" />
          <p className="text-[13px] text-[var(--color-ink-3)]">
            {tab === "firing"
              ? t("operator.incidents.empty_firing")
              : t("operator.incidents.empty")}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {incidents.map((i) => (
            <li
              key={i.id}
              className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] p-3"
            >
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  i.severity === "critical"
                    ? "text-[var(--color-tez-red)]"
                    : i.severity === "warn"
                      ? "text-[var(--color-tez-amber)]"
                      : "text-[var(--color-ink-4)]"
                }`}
              />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <p className="font-[var(--font-tez-mono)] text-[10px] uppercase tracking-[0.06em] text-[var(--color-ink-5)]">
                  {i.rule_id} · {t(severityKey(i.severity))} · {t(incidentStatusKey(i.status))}
                </p>
                <p className="text-[13px] text-[var(--color-ink)]">{i.summary}</p>
                <p className="text-[11px] text-[var(--color-ink-4)]">
                  {t("operator.incidents.first_fired", {
                    when: new Date(i.first_fired_at).toLocaleString(),
                  })}
                  {i.target_type === "company" && i.target_id && (
                    <>
                      {" · "}
                      <a
                        className="text-[var(--color-persimmon-2)] hover:underline"
                        href={`/operator/companies/${i.target_id}`}
                      >
                        {t("operator.incidents.view_company")}
                      </a>
                    </>
                  )}
                </p>
                {i.resolution_note && (
                  <p className="text-[11px] text-[var(--color-ink-4)] italic">
                    {t("operator.incidents.resolved_prefix")} · {i.resolution_note}
                  </p>
                )}
              </div>
              {i.status === "firing" && (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="secondary" onClick={() => ack(i.id)}>
                    {t("operator.incidents.ack")}
                  </Button>
                  <Button size="sm" onClick={() => setResolveFor(i)}>
                    {t("operator.incidents.resolve")}
                  </Button>
                </div>
              )}
              {i.status === "acknowledged" && (
                <Button size="sm" onClick={() => setResolveFor(i)}>
                  {t("operator.incidents.resolve")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {resolveFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] p-5">
            <h2 className="mb-1 text-[14px] font-semibold text-[var(--color-ink)]">
              {t("operator.incidents.resolve_title", { rule: resolveFor.rule_id })}
            </h2>
            <p className="mb-3 text-[12px] text-[var(--color-ink-4)]">
              {t("operator.incidents.resolve_note_help")}
            </p>
            <textarea
              value={resolveNote}
              onChange={(e) => setResolveNote(e.target.value)}
              rows={3}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-bone)] p-2 text-[13px] text-[var(--color-ink)] focus:border-[var(--color-ink-4)] focus:outline-none"
              placeholder={t("operator.incidents.resolve_note_placeholder")}
              autoFocus
            />
            <div className="mt-3 flex justify-end gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setResolveFor(null);
                  setResolveNote("");
                }}
              >
                {t("operator.incidents.cancel")}
              </Button>
              <Button size="sm" onClick={() => resolve(resolveFor.id, resolveNote)}>
                {t("operator.incidents.resolve_submit")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
