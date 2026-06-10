"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru as ruLocale, enUS, uz } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={t("hr.notifications.bell.aria_label")}
        className={cn(
          "relative inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]",
          "data-[state=open]:bg-[var(--color-surface-strong)] data-[state=open]:text-[var(--color-text)]",
        )}
      >
        <Bell className="h-[17px] w-[17px]" aria-hidden="true" />
        {unread > 0 && (
          <span
            className="data-mono absolute -top-1 -right-1 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-[8px] bg-[var(--color-accent)] px-1 text-[10px] font-semibold text-[var(--color-on-accent)]"
            aria-hidden="true"
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        aria-label={t("hr.notifications.bell.title")}
        className="w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-3.5 py-2.5">
          <div className="text-[13px] font-semibold text-[var(--color-text)]">
            {t("hr.notifications.bell.title")}
          </div>
          <button
            type="button"
            onClick={markAllRead}
            disabled={unread === 0}
            className={cn(
              "text-[11.5px] transition-colors",
              unread === 0
                ? "cursor-not-allowed text-[var(--color-text-subtle)]"
                : "text-[var(--color-primary)] hover:underline",
            )}
          >
            {t("hr.notifications.bell.mark_all_read")}
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-[12.5px] text-[var(--color-text-muted)]">
              {t("hr.notifications.bell.empty")}
            </div>
          ) : (
            items.map((n) => <BellRow key={n.id} row={n} locale={locale} />)
          )}
        </div>

        <Link
          href="/hr/activity"
          onClick={() => setOpen(false)}
          className="flex items-center justify-center border-t border-[var(--color-line)] px-3.5 py-2.5 text-[12px] font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-surface-subtle)]"
        >
          {t("hr.notifications.bell.view_all")}
        </Link>
      </PopoverContent>
    </Popover>
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
        "border-b border-[var(--color-line)] px-3.5 py-2.5 transition-colors last:border-b-0 hover:bg-[var(--color-surface-subtle)]",
        !row.read_at && "bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--color-surface))]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[12.5px] font-semibold leading-tight text-[var(--color-text)]">
          {row.title}
        </div>
        {!row.read_at && (
          <span
            aria-hidden
            className="mt-1 inline-block h-[6px] w-[6px] shrink-0 rounded-full bg-[var(--color-accent)]"
          />
        )}
      </div>
      {row.body && (
        <div className="mt-0.5 text-[11.5px] leading-[1.45] text-[var(--color-text-muted)]">
          {row.body}
        </div>
      )}
      <div className="data-mono mt-1 text-[10.5px] text-[var(--color-text-subtle)]">{ago}</div>
    </div>
  );
}
