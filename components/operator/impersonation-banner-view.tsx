"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  formatElapsed,
  formatRemaining,
  IMPERSONATION_MAX_MS,
  impersonationState,
  remainingMs,
} from "@/lib/operator/impersonation";
import { useTranslation } from "@/lib/i18n/provider";

interface Props {
  targetLabel: string;
  operatorLabel: string;
  startedAt: string;
}

export function ImpersonationBannerView({ targetLabel, operatorLabel, startedAt }: Props) {
  const { t } = useTranslation();
  const startedMs = Date.parse(startedAt);
  const [now, setNow] = useState<number>(() =>
    typeof window === "undefined" ? startedMs : Date.now(),
  );
  const [busy, setBusy] = useState(false);
  const endingRef = useRef(false);

  async function endSession() {
    if (endingRef.current) return;
    endingRef.current = true;
    setBusy(true);
    try {
      const res = await fetch("/api/operator/impersonate/end", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { signBackUrl?: string };
      window.location.href = data.signBackUrl ?? "/auth/login";
    } catch {
      endingRef.current = false;
      setBusy(false);
    }
  }

  useEffect(() => {
    const tick = () => {
      const n = Date.now();
      setNow(n);
      if (n - startedMs >= IMPERSONATION_MAX_MS) {
        void endSession();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [startedMs]);

  const elapsed = Math.max(0, now - startedMs);
  const state = impersonationState(elapsed);
  const remaining = remainingMs(elapsed);

  const tone =
    state === "warning"
      ? "bg-[var(--color-warning)] text-white"
      : "bg-[var(--color-accent)] text-white";

  return (
    <div
      role="alert"
      data-testid="impersonation-banner"
      data-state={state}
      className={`fixed inset-x-0 top-0 z-[60] flex min-h-[44px] items-center gap-3 px-4 py-2 text-[13px] shadow-[var(--shadow-level-2)] ${tone}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {state === "warning" && <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />}
        <div className="min-w-0 flex-1 truncate">
          <span className="font-semibold">{t("operator.impersonation.label")}</span>{" "}
          <span className="truncate">{targetLabel}</span>
          <span className="ml-2 opacity-80">
            {t("operator.impersonation.as", { operator: operatorLabel })}
          </span>
          <span
            className="nums ml-3 opacity-80"
            aria-label={t("operator.impersonation.aria_elapsed")}
          >
            · {t("operator.impersonation.elapsed_suffix", { duration: formatElapsed(elapsed) })}
          </span>
          {state === "warning" && (
            <span
              className="nums ml-3 font-semibold"
              aria-label={t("operator.impersonation.aria_remaining")}
            >
              · {t("operator.impersonation.remaining_suffix", { time: formatRemaining(remaining) })}
            </span>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={() => void endSession()}
        disabled={busy}
        className="rounded-[var(--radius-sm)] bg-white/95 px-3 py-1 text-xs font-semibold text-[var(--color-text)] hover:bg-white disabled:opacity-60"
      >
        {busy ? t("operator.impersonation.ending") : t("operator.impersonation.end_session")}
      </button>
    </div>
  );
}
