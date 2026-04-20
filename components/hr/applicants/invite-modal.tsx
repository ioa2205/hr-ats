"use client";

import { useState, useCallback, useMemo } from "react";
import { Copy, Check, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";
import { TezButton } from "@/components/hr/design";
import { cn } from "@/lib/utils";
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
        className="tezhr bg-paper border-rule !max-w-[520px] border p-0 sm:rounded-[8px]"
        style={{ fontSize: "13.5px" }}
      >
        <DialogHeader className="border-rule gap-1 border-b p-5 pb-4">
          <DialogTitle className="text-ink text-[17px] font-semibold tracking-[-0.01em]">
            {t("applicants.invite.title", { name: candidate.full_name })}
          </DialogTitle>
          <DialogDescription className="text-ink-4 text-[12.5px]">
            {t("applicants.invite.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 px-5 py-4">
          {/* Language segment */}
          <div className="flex items-center justify-between gap-3">
            <span
              className="text-ink-4 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
              {t("applicants.invite.copy_message")}
            </span>
            <div
              className="border-rule bg-bone-2 flex gap-0.5 rounded-[5px] border p-0.5"
              role="group"
              aria-label="Language"
            >
              {LANGS.map((l) => {
                const active = lang === l.value;
                return (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => setLang(l.value)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-[3px] px-2.5 py-[3px] text-[10.5px] font-semibold tracking-[0.04em] transition-colors",
                      active
                        ? "bg-ink text-paper"
                        : "text-ink-4 hover:bg-bone hover:text-ink",
                    )}
                    style={{ fontFamily: "var(--font-tez-mono)" }}
                  >
                    {l.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Message preview */}
          <div className="border-rule bg-bone-2/60 whitespace-pre-wrap rounded-[5px] border px-3.5 py-3 text-[13px] leading-[1.55] text-ink-2">
            {renderedMessage || (
              <span className="text-ink-5 italic">—</span>
            )}
          </div>

          {/* Candidate contact line */}
          <div className="border-rule flex items-center justify-between gap-3 rounded-[5px] border px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="text-ink-4 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                style={{ fontFamily: "var(--font-tez-mono)" }}>
                Telegram
              </div>
              <div
                className="text-ink truncate text-[13px]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {candidate.phone_number}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <TezButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleCopy}
                leadingIcon={
                  copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />
                }
              >
                {copied ? t("common.copied") : t("common.copy")}
              </TezButton>
              <a href={telegramLink} target="_blank" rel="noopener noreferrer">
                <TezButton
                  type="button"
                  variant="accent"
                  size="sm"
                  leadingIcon={<Send className="h-3 w-3" />}
                >
                  {t("applicants.invite.open_telegram")}
                </TezButton>
              </a>
            </div>
          </div>
        </div>

        <DialogFooter className="border-rule flex justify-end gap-2 border-t px-5 py-3">
          <TezButton variant="ghost" onClick={() => onOpenChange(false)} disabled={marking}>
            {t("common.cancel")}
          </TezButton>
          <TezButton
            variant="primary"
            onClick={handleMarkInvited}
            disabled={marking}
            leadingIcon={marking ? <Loader2 className="h-3 w-3 animate-spin" /> : undefined}
          >
            {t("applicants.invite.mark_invited")}
          </TezButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
