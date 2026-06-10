"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru as ruLocale, enUS, uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/lib/i18n/types";

interface NotifRow {
  id: string;
  event: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: unknown;
  read_at: string | null;
  created_at: string;
}

const dateLocaleByLocale: Record<Locale, typeof ruLocale> = {
  ru: ruLocale,
  uz,
  en: enUS,
};

export function NotificationsBell({
  companyId,
  userId,
}: {
  companyId: string;
  userId: string;
}) {
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<NotifRow[]>([]);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Unique per mount: the responsive shell renders a desktop and a mobile bell
  // (one hidden via CSS at any breakpoint), and Supabase caches realtime
  // channels by topic — a shared topic would throw "cannot add callbacks after
  // subscribe()". A per-instance topic gives each its own channel.
  const instanceId = useId();

  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/hr/notifications?limit=20", { cache: "no-store" })
      .then((res) => (res.ok ? (res.json() as Promise<{ notifications: NotifRow[] }>) : null))
      .then((data) => {
        if (cancelled || !data) return;
        setItems(data.notifications);
      })
      .catch(() => {
        // silent
      });

    const supabase = createClient();
    const channel = supabase
      .channel(`company:${companyId}:notifications:${instanceId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `company_id=eq.${companyId}`,
        },
        (payload) => {
          const row = payload.new as NotifRow;
          if (row.read_at) return;
          setItems((prev) => [row, ...prev].slice(0, 20));
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [companyId, userId, instanceId]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const markAllRead = useCallback(async () => {
    if (unread === 0) return;
    const unreadIds = items.filter((n) => !n.read_at).map((n) => n.id);
    setItems((prev) =>
      prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    );
    try {
      await fetch("/api/hr/notifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: unreadIds }),
      });
    } catch {
      // silent — list will re-sync next load
    }
  }, [items, unread]);

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        aria-label={t("hr.notifications.bell.aria_label")}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]",
          open && "bg-[var(--color-surface-strong)] text-[var(--color-text)]",
        )}
      >
        <Bell className="h-[17px] w-[17px]" />
        {unread > 0 && (
          <span
            className="bg-persimmon text-paper absolute -right-1 -top-1 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-[8px] px-1 text-[10px] font-semibold tabular-nums"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t("hr.notifications.bell.title")}
          className="border-rule bg-paper shadow-tez-3 absolute right-0 top-[calc(100%+8px)] z-40 flex w-[360px] flex-col overflow-hidden rounded-[6px] border"
        >
          <div className="border-rule flex items-center justify-between gap-3 border-b px-3.5 py-2.5">
            <div className="text-ink text-[13px] font-semibold">
              {t("hr.notifications.bell.title")}
            </div>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unread === 0}
              className={cn(
                "text-[11.5px] transition-colors",
                unread === 0
                  ? "text-ink-6 cursor-not-allowed"
                  : "text-persimmon hover:text-persimmon-2",
              )}
            >
              {t("hr.notifications.bell.mark_all_read")}
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {items.length === 0 ? (
              <div className="text-ink-4 px-4 py-10 text-center text-[12.5px]">
                {t("hr.notifications.bell.empty")}
              </div>
            ) : (
              items.map((n) => (
                <BellRow key={n.id} row={n} locale={locale} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function BellRow({ row, locale }: { row: NotifRow; locale: Locale }) {
  const ago = formatDistanceToNow(new Date(row.created_at), {
    addSuffix: true,
    locale: dateLocaleByLocale[locale],
  });
  return (
    <div
      className={cn(
        "border-rule hover:bg-bone-2 border-b px-3.5 py-2.5 last:border-b-0",
        !row.read_at && "bg-persimmon-tint/25",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-ink text-[12.5px] font-semibold leading-tight">{row.title}</div>
        {!row.read_at && (
          <span
            aria-hidden
            className="bg-persimmon mt-1 inline-block h-[5px] w-[5px] shrink-0 rounded-full"
          />
        )}
      </div>
      {row.body && (
        <div className="text-ink-4 mt-0.5 text-[11.5px] leading-[1.45]">{row.body}</div>
      )}
      <div
        className="text-ink-5 mt-1 text-[10.5px]"
        style={{ fontFamily: "var(--font-tez-mono)" }}
      >
        {ago}
      </div>
    </div>
  );
}
