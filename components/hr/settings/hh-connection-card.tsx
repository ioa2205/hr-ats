"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Radar } from "lucide-react";
import { Panel, PanelHeader, PanelTitle, TezButton } from "@/components/hr/design";
import { useToast } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import { logger } from "@/lib/logger";

interface HhConnection {
  employer_name: string | null;
  employer_id: string | null;
  status: "active" | "needs_reconnect" | "disabled" | string;
  last_error: string | null;
  last_error_at: string | null;
  access_expires_at: string | null;
  updated_at: string | null;
}

interface HhConnectionCardProps {
  /** owner/admin may run the OAuth connect/disconnect. */
  canConnect: boolean;
  /** platform has hh OAuth app credentials set (precondition for connecting). */
  hhConfigured: boolean;
}

const TONE: Record<string, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  needs_reconnect: "border-amber-200 bg-amber-50 text-amber-700",
  none: "border-rule bg-bone text-ink-3",
};

export function HhConnectionCard({ canConnect, hhConfigured }: HhConnectionCardProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<HhConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const toastedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/hr/hh/connection");
      if (res.ok) {
        const data = (await res.json()) as { connection: HhConnection | null };
        setConnection(data.connection);
      }
    } catch (err) {
      logger.error({ err: String(err) }, "[sourcing] hh connection load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // One-shot toast on return from the OAuth callback (?hh=connected|failed).
  useEffect(() => {
    if (toastedRef.current) return;
    const flag = searchParams.get("hh");
    if (flag === "connected") {
      toastedRef.current = true;
      toast({ variant: "success", title: t("sourcing.hh.connected_toast") });
    } else if (flag === "failed") {
      toastedRef.current = true;
      toast({ variant: "error", title: t("sourcing.hh.failed_toast") });
    }
  }, [searchParams, toast, t]);

  async function disconnect() {
    setBusy(true);
    try {
      const res = await fetch("/api/hr/hh/connection", { method: "DELETE" });
      if (res.ok) {
        await load();
        router.refresh();
      } else {
        toast({ variant: "error", title: t("sourcing.hh.failed_toast") });
      }
    } catch (err) {
      logger.error({ err: String(err) }, "[sourcing] hh disconnect failed");
      toast({ variant: "error", title: t("sourcing.hh.failed_toast") });
    } finally {
      setBusy(false);
    }
  }

  const isActive = connection?.status === "active";
  const needsReconnect = connection?.status === "needs_reconnect";
  const connected = isActive || needsReconnect;
  const tone = isActive ? TONE.active : needsReconnect ? TONE.needs_reconnect : TONE.none;
  const statusLabel = isActive
    ? t("sourcing.hh.status_connected")
    : needsReconnect
      ? t("sourcing.hh.status_needs_reconnect")
      : t("sourcing.hh.status_not_connected");

  return (
    <Panel className="mb-4">
      <PanelHeader>
        <PanelTitle>{t("sourcing.hh.title")}</PanelTitle>
      </PanelHeader>
      <div className="space-y-3 p-[18px]">
        <p className="text-ink-4 text-[12.5px] leading-[1.5]">{t("sourcing.hh.subtitle")}</p>

        {!hhConfigured ? (
          <p className="text-ink-5 text-[12px]">{t("sourcing.hh.not_configured")}</p>
        ) : loading ? (
          <div className="bg-bone-2 h-5 w-40 animate-pulse rounded-[4px]" />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11.5px] font-medium ${tone}`}
              >
                {statusLabel}
              </span>
              {isActive && connection?.employer_name && (
                <span className="text-ink-3 text-[12px]">
                  {t("sourcing.hh.connected_as", { name: connection.employer_name })}
                </span>
              )}
            </div>

            {needsReconnect && connection?.last_error && (
              <p className="text-persimmon-2 text-[11.5px]">
                {t("sourcing.hh.last_error")}: {connection.last_error}
              </p>
            )}

            <p className="text-ink-5 text-[11.5px] leading-[1.5]">
              {t("sourcing.hh.employer_required")}
            </p>

            {canConnect ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <TezButton
                  size="sm"
                  variant={connected ? "secondary" : "primary"}
                  leadingIcon={<Radar className="h-3 w-3" />}
                  disabled={busy}
                  onClick={() => {
                    window.location.href = "/api/hr/hh/oauth/start";
                  }}
                >
                  {needsReconnect
                    ? t("sourcing.hh.reconnect")
                    : connected
                      ? t("sourcing.hh.reconnect")
                      : t("sourcing.hh.connect")}
                </TezButton>
                {connected && (
                  <TezButton size="sm" variant="ghost" disabled={busy} onClick={disconnect}>
                    {t("sourcing.hh.disconnect")}
                  </TezButton>
                )}
              </div>
            ) : (
              <p className="text-ink-5 text-[11.5px]">{t("sourcing.hh.admin_only")}</p>
            )}
          </>
        )}
      </div>
    </Panel>
  );
}
