"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Radar } from "lucide-react";
import {
  Badge,
  Button,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  Skeleton,
  useToast,
} from "@/components/ui";
import { ButtonSpinner } from "@/components/hr/settings/settings-ui";
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
  const statusTone = isActive ? "success" : needsReconnect ? "warning" : "neutral";
  const statusLabel = isActive
    ? t("sourcing.hh.status_connected")
    : needsReconnect
      ? t("sourcing.hh.status_needs_reconnect")
      : t("sourcing.hh.status_not_connected");

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t("sourcing.hh.title")}</PanelTitle>
        {!loading && hhConfigured && (
          <Badge tone={statusTone} variant="dot">
            {statusLabel}
          </Badge>
        )}
      </PanelHeader>
      <PanelBody className="space-y-3">
        <p className="text-[12.5px] leading-[1.5] text-[var(--color-text-muted)]">
          {t("sourcing.hh.subtitle")}
        </p>

        {!hhConfigured ? (
          <p className="text-[12px] text-[var(--color-text-subtle)]">
            {t("sourcing.hh.not_configured")}
          </p>
        ) : loading ? (
          <Skeleton variant="rect" className="h-5 w-40" />
        ) : (
          <>
            {isActive && connection?.employer_name && (
              <p className="text-[12px] text-[var(--color-text)]">
                {t("sourcing.hh.connected_as", { name: connection.employer_name })}
              </p>
            )}

            {needsReconnect && connection?.last_error && (
              <p className="text-[11.5px] text-[var(--color-danger)]">
                {t("sourcing.hh.last_error")}: {connection.last_error}
              </p>
            )}

            <p className="text-[11.5px] leading-[1.5] text-[var(--color-text-subtle)]">
              {t("sourcing.hh.employer_required")}
            </p>

            {canConnect ? (
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Button
                  size="sm"
                  variant={connected ? "secondary" : "primary"}
                  disabled={busy}
                  onClick={() => {
                    window.location.href = "/api/hr/hh/oauth/start";
                  }}
                >
                  {busy ? <ButtonSpinner /> : <Radar className="h-3.5 w-3.5" aria-hidden="true" />}
                  {connected ? t("sourcing.hh.reconnect") : t("sourcing.hh.connect")}
                </Button>
                {connected && (
                  <Button size="sm" variant="ghost" disabled={busy} onClick={disconnect}>
                    {t("sourcing.hh.disconnect")}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-[11.5px] text-[var(--color-text-subtle)]">
                {t("sourcing.hh.admin_only")}
              </p>
            )}
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
