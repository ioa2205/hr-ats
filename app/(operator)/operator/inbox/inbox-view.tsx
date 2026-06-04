"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Inbox, Mail, Building2, Globe, Clock, Check, RotateCcw } from "lucide-react";
import { Button, Badge, EmptyState } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import { markInboxRead, markInboxUnread, markAllInboxRead } from "@/lib/actions/inbox";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  locale: string | null;
  source: string;
  read_at: string | null;
  created_at: string;
}

function formatWhen(
  iso: string,
  t: (k: "operator.time.just_now" | "operator.time.mins_ago" | "operator.time.hours_ago", vars?: Record<string, string>) => string,
): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMin = Math.round((now - d.getTime()) / 60000);
  if (diffMin < 1) return t("operator.time.just_now");
  if (diffMin < 60) return t("operator.time.mins_ago", { n: String(diffMin) });
  if (diffMin < 60 * 24)
    return t("operator.time.hours_ago", { n: String(Math.round(diffMin / 60)) });
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-on-surface-variant hover:text-primary text-xs font-medium underline-offset-2 hover:underline"
    >
      {copied ? t("common.copied") : label}
    </button>
  );
}

function MessageCard({ msg }: { msg: ContactMessage }) {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();
  const unread = msg.read_at === null;

  const toggleRead = () => {
    startTransition(async () => {
      if (unread) {
        await markInboxRead(msg.id);
      } else {
        await markInboxUnread(msg.id);
      }
    });
  };

  return (
    <article
      className={
        "border-outline-variant bg-surface rounded-[var(--radius-md)] border p-4 sm:p-5 " +
        (unread ? "ring-danger/30 ring-2 ring-offset-0" : "")
      }
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-on-surface text-base font-semibold">{msg.name}</h3>
          {unread && (
            <Badge tone="danger" size="sm">
              {t("inbox.badge_new")}
            </Badge>
          )}
        </div>
        <div className="text-on-surface-variant flex items-center gap-1.5 text-xs">
          <Clock className="h-3.5 w-3.5" />
          <span title={new Date(msg.created_at).toISOString()}>
            {formatWhen(msg.created_at, t)}
          </span>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        <div className="flex items-center gap-1.5">
          <Mail className="text-on-surface-variant h-3.5 w-3.5" />
          <a href={`mailto:${msg.email}`} className="text-primary hover:underline">
            {msg.email}
          </a>
          <CopyButton text={msg.email} label={t("common.copy")} />
        </div>
        {msg.company && (
          <div className="flex items-center gap-1.5">
            <Building2 className="text-on-surface-variant h-3.5 w-3.5" />
            <span className="text-on-surface">{msg.company}</span>
          </div>
        )}
        {msg.locale && (
          <div className="flex items-center gap-1.5">
            <Globe className="text-on-surface-variant h-3.5 w-3.5" />
            <span className="text-on-surface-variant text-xs uppercase">{msg.locale}</span>
          </div>
        )}
      </div>

      <p className="text-on-surface mb-4 text-[15px] leading-relaxed whitespace-pre-wrap">
        {msg.message}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleRead}
          disabled={pending}
        >
          {unread ? (
            <>
              <Check className="h-4 w-4" />
              {t("inbox.mark_read")}
            </>
          ) : (
            <>
              <RotateCcw className="h-4 w-4" />
              {t("inbox.mark_unread")}
            </>
          )}
        </Button>
        <a
          href={`mailto:${msg.email}?subject=${encodeURIComponent(
            t("operator.inbox.reply_subject", { name: msg.name }),
          )}`}
          className="text-primary hover:bg-surface-container inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium"
        >
          <Mail className="h-4 w-4" />
          {t("inbox.reply_email")}
        </a>
      </div>
    </article>
  );
}

function inboxHref(filter: "unread" | "all", page: number): string {
  const params = new URLSearchParams();
  if (filter === "all") params.set("filter", "all");
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/operator/inbox?${qs}` : "/operator/inbox";
}

export function InboxView({
  messages,
  unreadCount,
  filter,
  page,
  totalPages,
}: {
  messages: ContactMessage[];
  unreadCount: number;
  filter: "unread" | "all";
  page: number;
  totalPages: number;
}) {
  const { t } = useTranslation();
  const [pendingAll, startAllTransition] = useTransition();

  const handleMarkAll = () => {
    startAllTransition(async () => {
      await markAllInboxRead();
    });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-on-surface text-2xl font-semibold">{t("inbox.title")}</h1>
          <p className="text-on-surface-variant mt-1 text-sm">{t("inbox.subtitle")}</p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="secondary"
            size="sm"
            onClick={handleMarkAll}
            disabled={pendingAll}
          >
            <Check className="h-4 w-4" />
            {t("inbox.mark_all_read")}
          </Button>
        )}
      </header>

      <div className="border-outline-variant flex gap-1 border-b">
        <Link
          href="/operator/inbox"
          className={
            "relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium " +
            (filter === "unread"
              ? "text-primary border-primary -mb-px border-b-2"
              : "text-on-surface-variant hover:text-on-surface")
          }
        >
          {t("inbox.tab_unread")}
          {unreadCount > 0 && (
            <Badge tone="danger" size="sm">
              {unreadCount}
            </Badge>
          )}
        </Link>
        <Link
          href="/operator/inbox?filter=all"
          className={
            "relative inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium " +
            (filter === "all"
              ? "text-primary border-primary -mb-px border-b-2"
              : "text-on-surface-variant hover:text-on-surface")
          }
        >
          {t("inbox.tab_all")}
        </Link>
      </div>

      {messages.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={
            filter === "unread" ? t("inbox.empty_unread_title") : t("inbox.empty_all_title")
          }
          description={
            filter === "unread" ? t("inbox.empty_unread_desc") : t("inbox.empty_all_desc")
          }
        />
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <MessageCard key={msg.id} msg={msg} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-on-surface-variant text-sm">
            {t("common.page_of", { page: String(page), total: String(totalPages) })}
          </span>
          <div className="flex items-center gap-2">
            {page > 1 ? (
              <Link href={inboxHref(filter, page - 1)}>
                <Button variant="secondary" size="sm">
                  {t("common.previous")}
                </Button>
              </Link>
            ) : (
              <Button variant="secondary" size="sm" disabled>
                {t("common.previous")}
              </Button>
            )}
            {page < totalPages ? (
              <Link href={inboxHref(filter, page + 1)}>
                <Button variant="secondary" size="sm">
                  {t("common.next")}
                </Button>
              </Link>
            ) : (
              <Button variant="secondary" size="sm" disabled>
                {t("common.next")}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
