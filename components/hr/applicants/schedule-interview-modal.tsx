"use client";

import { useCallback, useMemo, useState } from "react";
import {
  CalendarPlus,
  Check,
  Copy,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui";
import { Pill, Seg, TezButton } from "@/components/hr/design";
import { useTranslation } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import {
  DURATION_MINUTES,
  LOCATION_KINDS,
  type LocationKind,
} from "@/lib/interviews/validators";

interface ScheduleInterviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidateId: string;
  candidateName: string;
  appUrl: string;
  defaultSlots: string[];
  onCreated: (request: { id: string; public_token: string; expires_at: string }) => void;
}

interface SlotRow {
  key: string;
  value: string;
}

function nextKey(): string {
  return Math.random().toString(36).slice(2, 9);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toLocalInputValue(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function localInputToIso(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function ScheduleInterviewModal({
  open,
  onOpenChange,
  candidateId,
  candidateName,
  appUrl,
  defaultSlots,
  onCreated,
}: ScheduleInterviewModalProps) {
  const { t } = useTranslation();
  const [duration, setDuration] = useState<15 | 30 | 45 | 60>(30);
  const [locationKind, setLocationKind] = useState<LocationKind>("google_meet");
  const [locationDetail, setLocationDetail] = useState("");
  const [hrMessage, setHrMessage] = useState("");
  const [slots, setSlots] = useState<SlotRow[]>(() =>
    defaultSlots.map((iso) => ({ key: nextKey(), value: toLocalInputValue(iso) })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [created, setCreated] = useState<{
    public_token: string;
    expires_at: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = useCallback(() => {
    setSubmitting(false);
    setErrMsg(null);
    setCreated(null);
    setCopied(false);
    setHrMessage("");
    setLocationDetail("");
    setSlots(defaultSlots.map((iso) => ({ key: nextKey(), value: toLocalInputValue(iso) })));
  }, [defaultSlots]);

  const handleClose = useCallback(
    (next: boolean) => {
      if (!next) {
        reset();
      }
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const addSlot = useCallback(() => {
    setSlots((prev) => (prev.length >= 6 ? prev : [...prev, { key: nextKey(), value: "" }]));
  }, []);

  const removeSlot = useCallback((key: string) => {
    setSlots((prev) => (prev.length <= 3 ? prev : prev.filter((s) => s.key !== key)));
  }, []);

  const updateSlot = useCallback((key: string, value: string) => {
    setSlots((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  }, []);

  const publicUrl = useMemo(() => {
    if (!created) return "";
    return `${appUrl}/interview/${created.public_token}`;
  }, [appUrl, created]);

  const handleSubmit = useCallback(async () => {
    setErrMsg(null);

    const isos: string[] = [];
    for (const s of slots) {
      const iso = localInputToIso(s.value);
      if (!iso) {
        setErrMsg(t("interview.hr.modal.error.invalid_slots"));
        return;
      }
      isos.push(iso);
    }

    if (isos.length < 3 || isos.length > 6) {
      setErrMsg(t("interview.hr.modal.error.slot_count"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/hr/candidates/${candidateId}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration_minutes: duration,
          location_kind: locationKind,
          location_detail: locationDetail.trim() || null,
          hr_message: hrMessage.trim() || null,
          slot_start_ats: isos,
        }),
      });

      if (res.status === 402) {
        setErrMsg(t("interview.hr.modal.quota_blocked"));
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrMsg(body.error === "validation_failed"
          ? t("interview.hr.modal.error.invalid_slots")
          : t("interview.hr.modal.error.generic"));
        return;
      }

      const body = (await res.json()) as {
        id: string;
        public_token: string;
        expires_at: string;
      };
      setCreated({ public_token: body.public_token, expires_at: body.expires_at });
      onCreated(body);
    } catch {
      setErrMsg(t("interview.hr.modal.error.generic"));
    } finally {
      setSubmitting(false);
    }
  }, [
    candidateId,
    duration,
    hrMessage,
    locationDetail,
    locationKind,
    onCreated,
    slots,
    t,
  ]);

  const handleCopy = useCallback(async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = publicUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }, [publicUrl]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="tezhr bg-paper border-rule !max-w-[560px] border p-0 sm:rounded-[8px]"
        style={{ fontSize: "13.5px" }}
      >
        <DialogHeader className="border-rule gap-1 border-b p-5 pb-4">
          <DialogTitle className="text-ink text-[17px] font-semibold tracking-[-0.01em]">
            {created
              ? t("interview.hr.modal.sent_title")
              : t("interview.hr.modal.title", { name: candidateName })}
          </DialogTitle>
          <DialogDescription className="text-ink-4 text-[12.5px]">
            {created ? t("interview.hr.modal.sent_sub") : t("interview.hr.modal.sub")}
          </DialogDescription>
        </DialogHeader>

        {!created ? (
          <div className="flex max-h-[68vh] flex-col gap-4 overflow-y-auto px-5 py-4">
            <Field label={t("interview.hr.modal.duration_label")}>
              <Seg<"15" | "30" | "45" | "60">
                value={String(duration) as "15" | "30" | "45" | "60"}
                options={DURATION_MINUTES.map((d) => ({
                  value: String(d) as "15" | "30" | "45" | "60",
                  label: t(`interview.duration_${d}`),
                }))}
                onChange={(v) => setDuration(Number(v) as 15 | 30 | 45 | 60)}
              />
            </Field>

            <Field label={t("interview.hr.modal.location_label")}>
              <div className="flex flex-wrap gap-1.5">
                {LOCATION_KINDS.map((kind) => {
                  const active = kind === locationKind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setLocationKind(kind)}
                      className={cn(
                        "rounded-[4px] border px-2.5 py-[5px] text-[12px] font-medium transition-colors",
                        active
                          ? "bg-ink text-paper border-ink"
                          : "bg-paper text-ink-3 border-rule-2 hover:bg-bone-2",
                      )}
                    >
                      {t(`interview.location.${kind}`)}
                    </button>
                  );
                })}
              </div>
            </Field>

            <Field label={t("interview.hr.modal.location_detail_placeholder")}>
              <input
                value={locationDetail}
                onChange={(e) => setLocationDetail(e.target.value)}
                placeholder={t("interview.hr.modal.location_detail_placeholder")}
                maxLength={200}
                className="border-rule bg-paper text-ink placeholder:text-ink-5 focus:border-ink h-[36px] w-full rounded-[5px] border px-3 text-[13px] focus:outline-none"
              />
            </Field>

            <Field label={t("interview.hr.modal.message_label")}>
              <textarea
                value={hrMessage}
                onChange={(e) => setHrMessage(e.target.value)}
                placeholder={t("interview.hr.modal.message_placeholder")}
                maxLength={500}
                rows={3}
                className="border-rule bg-paper text-ink placeholder:text-ink-5 focus:border-ink min-h-[78px] w-full resize-none rounded-[5px] border px-3 py-2 text-[13px] leading-[1.5] focus:outline-none"
              />
              <div
                className="text-ink-5 mt-1 text-right text-[10.5px]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {hrMessage.length}/500
              </div>
            </Field>

            <Field
              label={t("interview.hr.modal.slots_label")}
              hint={t("interview.timezone_note")}
            >
              <ul className="flex flex-col gap-1.5">
                {slots.map((slot, idx) => (
                  <li
                    key={slot.key}
                    className="border-rule bg-bone-2/40 flex items-center gap-2 rounded-[5px] border px-2 py-1.5"
                  >
                    <span
                      className="text-ink-4 w-[26px] text-right text-[10.5px] font-semibold"
                      style={{ fontFamily: "var(--font-tez-mono)" }}
                    >
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <input
                      type="datetime-local"
                      value={slot.value}
                      onChange={(e) => updateSlot(slot.key, e.target.value)}
                      className="border-rule bg-paper text-ink focus:border-ink h-[32px] flex-1 rounded-[4px] border px-2 text-[13px] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(slot.key)}
                      disabled={slots.length <= 3}
                      aria-label="Remove slot"
                      className="text-ink-5 hover:bg-bone-2 hover:text-persimmon-2 rounded-[4px] p-1 transition-colors disabled:opacity-30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={addSlot}
                disabled={slots.length >= 6}
                className="text-ink-3 hover:bg-bone-2 mt-1.5 inline-flex items-center gap-1.5 rounded-[4px] border-none bg-transparent px-2 py-1 text-[12px] font-medium transition-colors disabled:opacity-40"
              >
                <Plus className="h-3 w-3" />
                {t("interview.hr.modal.add_slot")}
              </button>
            </Field>

            {errMsg && (
              <div
                role="alert"
                className="border-persimmon bg-persimmon-tint text-persimmon-2 rounded-[5px] border px-3 py-2 text-[12.5px] font-medium"
              >
                {errMsg}
              </div>
            )}

            <div
              className="text-ink-5 text-[10.5px] uppercase tracking-[0.08em]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
              {t("interview.hr.modal.expiry_hint")}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-5 py-5">
            <div className="border-rule bg-bone-2/60 rounded-[5px] border px-3 py-2.5">
              <div
                className="text-ink-5 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {t("interview.hr.block.public_link")}
              </div>
              <div
                className="text-ink mt-0.5 truncate text-[13px]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {publicUrl}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <TezButton
                variant="primary"
                size="md"
                onClick={handleCopy}
                leadingIcon={
                  copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />
                }
              >
                {copied ? t("interview.hr.block.copied") : t("interview.hr.block.copy_link")}
              </TezButton>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(t("interview.hr.share.telegram_body"))}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <TezButton variant="secondary" size="md" leadingIcon={<Send className="h-3 w-3" />}>
                  {t("interview.hr.block.send_telegram")}
                </TezButton>
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(t("interview.hr.share.whatsapp_body") + " " + publicUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <TezButton variant="secondary" size="md" leadingIcon={<Send className="h-3 w-3" />}>
                  WhatsApp
                </TezButton>
              </a>
            </div>
            <Pill tone="success" dot>
              {t("interview.hr.modal.confirmed_inline")}
            </Pill>
          </div>
        )}

        <DialogFooter className="border-rule flex justify-end gap-2 border-t px-5 py-3">
          {!created ? (
            <>
              <TezButton variant="ghost" onClick={() => handleClose(false)} disabled={submitting}>
                {t("common.cancel")}
              </TezButton>
              <TezButton
                variant="accent"
                onClick={handleSubmit}
                disabled={submitting}
                leadingIcon={
                  submitting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <CalendarPlus className="h-3 w-3" />
                  )
                }
              >
                {t("interview.hr.modal.cta")}
              </TezButton>
            </>
          ) : (
            <TezButton variant="primary" onClick={() => handleClose(false)}>
              {t("common.cancel")}
            </TezButton>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-ink text-[12.5px] font-semibold tracking-[-0.005em]">
        {label}
      </label>
      {children}
      {hint && (
        <p
          className="text-ink-5 text-[10.5px] uppercase tracking-[0.08em]"
          style={{ fontFamily: "var(--font-tez-mono)" }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
