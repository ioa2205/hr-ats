"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Radar } from "lucide-react";
import { Badge, Button, useToast } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import { logger } from "@/lib/logger";

interface HhHealth {
  configured: boolean;
  scope: "company" | "platform" | "none";
  status: "ok" | "needs_reconnect" | "not_configured" | "error";
  employerName?: string | null;
  employerId?: string | null;
  error?: { status?: number; code?: string; message: string };
}

/**
 * Operator-only card to manage the platform-wide hh.uz fallback connection — one
 * shared employer account every tenant searches through unless it connected its
 * own. Drives /api/operator/hh/oauth/start (Connect) and the connection route.
 */
export function HhPlatformConnectionCard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [health, setHealth] = useState<HhHealth | null>(null);
  const [baseConfigured, setBaseConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const toastedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/hh/connection");
      if (res.ok) {
        const data = (await res.json()) as { health: HhHealth | null; baseConfigured: boolean };
        setHealth(data.health ?? null);
        setBaseConfigured(Boolean(data.baseConfigured));
      }
    } catch (err) {
      logger.error({ err: String(err) }, "[operator] hh connection load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (toastedRef.current) return;
    const flag = searchParams.get("hh");
    if (flag === "connected") {
      toastedRef.current = true;
      toast({ variant: "success", title: t("operator.hh.connected_toast") });
    } else if (flag === "failed") {
      toastedRef.current = true;
      toast({ variant: "error", title: t("operator.hh.failed_toast") });
    }
  }, [searchParams, toast, t]);

  async function disconnect() {
    setBusy(true);
    try {
      const res = await fetch("/api/operator/hh/connection", { method: "DELETE" });
      if (res.ok) {
        await load();
        router.refresh();
      } else {
        toast({ variant: "error", title: t("operator.hh.failed_toast") });
      }
    } catch (err) {
      logger.error({ err: String(err) }, "[operator] hh disconnect failed");
      toast({ variant: "error", title: t("operator.hh.failed_toast") });
    } finally {
      setBusy(false);
    }
  }

  const ok = health?.status === "ok";
  const error = health?.status === "error" || health?.status === "needs_reconnect";
  const connected = ok || error;

  return (
    <div className="bg-surface-container rounded-[var(--radius-lg)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-on-surface text-sm font-semibold">{t("operator.hh.title")}</h2>
          <p className="text-on-surface-variant mt-0.5 text-xs">{t("operator.hh.subtitle")}</p>
        </div>
        {!loading && (
          <Badge tone={ok ? "success" : error ? "danger" : "neutral"} size="sm">
            {ok
              ? t("operator.hh.status_connected")
              : error
                ? t("operator.hh.status_error")
                : t("operator.hh.status_not_connected")}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="bg-surface-variant mt-3 h-5 w-48 animate-pulse rounded-[var(--radius-sm)]" />
      ) : (
        <div className="mt-3 space-y-2">
          {ok && health?.employerName && (
            <p className="text-on-surface-variant text-xs">
              {t("operator.hh.connected_as", { name: health.employerName })}
            </p>
          )}
          {error && health?.error?.message && (
            <p className="text-danger text-xs">
              {[health.error.status, health.error.message].filter(Boolean).join(" ")}
            </p>
          )}
          <p className="text-on-surface-variant text-xs">{t("operator.hh.employer_required")}</p>

          {baseConfigured ? (
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() => {
                  window.location.href = "/api/operator/hh/oauth/start";
                }}
              >
                <Radar className="h-4 w-4" />
                {connected ? t("operator.hh.reconnect") : t("operator.hh.connect")}
              </Button>
              {connected && (
                <Button variant="secondary" size="sm" disabled={busy} onClick={disconnect}>
                  {t("operator.hh.disconnect")}
                </Button>
              )}
            </div>
          ) : (
            <p className="text-on-surface-variant text-xs">{t("operator.hh.not_configured")}</p>
          )}
        </div>
      )}
    </div>
  );
}
