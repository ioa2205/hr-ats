"use client";

import { useState, useCallback, useMemo } from "react";
import { Copy, Check, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  SegmentedControl,
} from "@/components/ui";
import type { Candidate } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";

type Lang = "ru" | "uz" | "en";

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidate: Candidate;
  postingTitle: string;
  templates: Record<string, string>;
  onUpdate: (id: string, updates: Partial<Candidate>) => void;
}

const LANGS: { value: Lang; label: string }[] = [
  { value: "ru", label: "RU" },
  { value: "uz", label: "UZ" },
  { value: "en", label: "EN" },
];

function getFirstName(fullName: string): string {
  return fullName.split(" ")[0];
}

function renderTemplate(template: string, firstName: string, position: string): string {
  return template.replace(/\{name\}/g, firstName).replace(/\{position\}/g, position);
}

function formatTelegramLink(phone: string): string {
  return `https://t.me/${phone}`;
}

export function InviteModal({
  open,
  onOpenChange,
  candidate,
  postingTitle,
  templates,
  onUpdate,
}: InviteModalProps) {
  const { t } = useTranslation();
  const defaultLang: Lang = (["ru", "uz", "en"] as const).includes(
    candidate.language_detected as Lang,
  )
    ? (candidate.language_detected as Lang)
    : "ru";

  const [lang, setLang] = useState<Lang>(defaultLang);
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);

  const firstName = getFirstName(candidate.full_name);

  const renderedMessage = useMemo(() => {
    const template = templates[`telegram_invite_${lang}`] ?? "";
    return renderTemplate(template, firstName, postingTitle);
  }, [lang, templates, firstName, postingTitle]);

  const telegramLink = formatTelegramLink(candidate.phone_number);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(renderedMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = renderedMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [renderedMessage]);

  const handleMarkInvited = useCallback(async () => {
    setMarking(true);
    try {
      const res = await fetch(`/api/hr/candidates/${candidate.id}/invite`, {
        method: "PATCH",
      });
      if (res.ok) {
        onUpdate(candidate.id, {
          status: "invited",
          invited_at: new Date().toISOString(),
        });
        onOpenChange(false);
      }
    } finally {
      setMarking(false);
    }
  }, [candidate.id, onUpdate, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="!max-w-[520px] border border-[var(--color-line)] bg-[var(--color-surface)] p-0"
        style={{ fontSize: "13.5px" }}
      >
        <DialogHeader className="gap-1 border-b border-[var(--color-line)] p-5 pb-4">
          <DialogTitle className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-text)]">
            {t("applicants.invite.title", { name: candidate.full_name })}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-[var(--color-text-muted)]">
            {t("applicants.invite.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-4">
          {/* Language segment */}
          <div className="flex items-center justify-between gap-3">
            <span className="data-mono text-[10.5px] font-semibold tracking-[0.1em] text-[var(--color-text-muted)] uppercase">
              {t("applicants.invite.copy_message")}
            </span>
            <SegmentedControl<Lang>
              size="sm"
              aria-label={t("applicants.invite.copy_message")}
              value={lang}
              options={LANGS}
              onChange={setLang}
            />
          </div>

          {/* Message preview */}
          <div className="whitespace-pre-wrap rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-3.5 py-3 text-[13px] leading-[1.55] text-[var(--color-text)]">
            {renderedMessage || (
              <span className="text-[var(--color-text-subtle)] italic">—</span>
            )}
          </div>

          {/* Candidate contact line */}
          <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="data-mono text-[10.5px] font-semibold tracking-[0.1em] text-[var(--color-text-muted)] uppercase">
                Telegram
              </div>
              <div
                className="data-mono truncate text-[13px] text-[var(--color-text)]"
              >
                {candidate.phone_number}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                aria-label={t("applicants.invite.copy_message")}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? t("common.copied") : t("common.copy")}
              </Button>
              <Button asChild variant="primary" size="sm">
                <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                  <Send className="h-3 w-3" />
                  {t("applicants.invite.open_telegram")}
                </a>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 border-t border-[var(--color-line)] px-5 py-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={marking}>
            {t("common.cancel")}
          </Button>
          <Button variant="primary" onClick={handleMarkInvited} loading={marking}>
            {t("applicants.invite.mark_invited")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
