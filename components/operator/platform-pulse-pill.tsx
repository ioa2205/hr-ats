"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import { severityKey } from "@/lib/operator/enum-labels";

interface Incident {
  id: number;
  rule_id: string;
  severity: "info" | "warn" | "critical";
  summary: string;
  target_label: string | null;
  first_fired_at: string;
}

/**
 * Platform health pill. Polls /api/operator/incidents on mount + every 30s
 * while the tab is visible. PR #6 wired; PR #9 will tie it to Supabase
 * Realtime for push updates instead of polling.
 */
export function PlatformPulsePill() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [firing, setFiring] = useState(0);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/operator/incidents?status=firing&limit=20", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const j = (await res.json()) as { data: Incident[]; firing: number };
      setFiring(j.firing ?? 0);
      setIncidents(j.data ?? []);
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    // Initial fetch deferred to a microtask so the setState it triggers
    // happens outside the effect body (satisfies react-hooks/set-state-in-effect).
    const initial = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 30_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, [load]);

  const state: "ok" | "amber" | "red" =
    firing === 0 ? "ok" : incidents.some((i) => i.severity === "critical") ? "red" : "amber";
  const dotClass =
    state === "red"
      ? "bg-[var(--color-danger)]"
      : state === "amber"
        ? "bg-[var(--color-warning)]"
        : "bg-[var(--color-success)]";
  const label =
    firing === 0
      ? t("operator.pulse.all_normal")
      : firing === 1
        ? t("operator.pulse.incident_one", { n: String(firing) })
        : t("operator.pulse.incident_many", { n: String(firing) });

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        data-testid="platform-pulse-pill"
        className="flex items-center gap-2 rounded-[var(--radius-full)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]"
        aria-label={t("operator.pulse.open_drawer")}
      >
        <span className="relative flex h-2 w-2">
          {firing === 0 && (
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotClass} opacity-60`} />
          )}
          <span className={`relative inline-flex h-2 w-2 rounded-full ${dotClass}`} />
        </span>
        <span>{label}</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("operator.pulse.incidents_title")}</DialogTitle>
            <DialogDescription>{t("operator.pulse.incidents_subtitle")}</DialogDescription>
          </DialogHeader>
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10">
              <CheckCircle2 className="h-8 w-8 text-[var(--color-success)]" />
              <p className="text-center text-sm text-[var(--color-text-muted)]">
                {t("operator.pulse.no_incidents")}
              </p>
            </div>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto">
              {incidents.map((i) => (
                <li
                  key={i.id}
                  className="flex items-start gap-3 border-b border-[var(--color-line)] px-5 py-3 last:border-0"
                >
                  <AlertTriangle
                    className={`mt-0.5 h-4 w-4 shrink-0 ${
                      i.severity === "critical"
                        ? "text-[var(--color-danger)]"
                        : "text-[var(--color-warning)]"
                    }`}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="font-[var(--font-mono)] text-[11px] uppercase tracking-wide text-[var(--color-text-subtle)]">
                      {i.rule_id} · {t(severityKey(i.severity))}
                    </p>
                    <p className="text-[13px] text-[var(--color-text)]">{i.summary}</p>
                    <p className="text-[11px] text-[var(--color-text-muted)]">
                      {new Date(i.first_fired_at).toLocaleString()}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-[var(--color-line)] px-5 py-3 text-center">
            <a
              href="/operator/incidents"
              className="text-[12px] font-medium text-[var(--color-accent-strong)] hover:underline"
            >
              {t("operator.pulse.open_console")}
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
