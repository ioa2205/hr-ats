"use client";

import { useCallback, useMemo, useState } from "react";
import { CalendarPlus, Check, Copy, Plus, Send, Trash2 } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  IconButton,
  Input,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
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
    <Dialog open={open} onOpenChange={(next) => (submitting ? undefined : handleClose(next))}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {created
              ? t("interview.hr.modal.sent_title")
              : t("interview.hr.modal.title", { name: candidateName })}
          </DialogTitle>
          <DialogDescription>
            {created ? t("interview.hr.modal.sent_sub") : t("interview.hr.modal.sub")}
          </DialogDescription>
        </DialogHeader>

        {!created ? (
          <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto px-6 py-2">
            <Field label={t("interview.hr.modal.duration_label")}>
              <SegmentedControl<"15" | "30" | "45" | "60">
                aria-label={t("interview.hr.modal.duration_label")}
                value={String(duration) as "15" | "30" | "45" | "60"}
                options={DURATION_MINUTES.map((d) => ({
                  value: String(d) as "15" | "30" | "45" | "60",
                  label: t(`interview.duration_${d}`),
                }))}
                onChange={(v) => setDuration(Number(v) as 15 | 30 | 45 | 60)}
              />
            </Field>

            <Field label={t("interview.hr.modal.location_label")}>
              <Select value={locationKind} onValueChange={(v) => setLocationKind(v as LocationKind)}>
                <SelectTrigger aria-label={t("interview.hr.modal.location_label")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOCATION_KINDS.map((kind) => (
                    <SelectItem key={kind} value={kind}>
                      {t(`interview.location.${kind}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Input
              label={t("interview.hr.modal.location_detail_placeholder")}
              value={locationDetail}
              onChange={(e) => setLocationDetail(e.target.value)}
              placeholder={t("interview.hr.modal.location_detail_placeholder")}
              maxLength={200}
            />

            <Textarea
              label={t("interview.hr.modal.message_label")}
              value={hrMessage}
              onChange={(e) => setHrMessage(e.target.value)}
              placeholder={t("interview.hr.modal.message_placeholder")}
              maxLength={500}
              maxCharacters={500}
              currentLength={hrMessage.length}
              rows={3}
            />

            <Field
              label={t("interview.hr.modal.slots_label")}
              helperText={t("interview.timezone_note")}
            >
              <ul className="flex flex-col gap-1.5">
                {slots.map((slot, idx) => (
                  <li key={slot.key} className="flex items-center gap-2">
                    <span className="data-mono w-[26px] shrink-0 text-right text-[10.5px] font-semibold text-[var(--color-text-muted)]">
                      {String(idx + 1).padStart(2, "0")}
                    </span>
                    <div className="flex-1">
                      <Input
                        type="datetime-local"
                        value={slot.value}
                        onChange={(e) => updateSlot(slot.key, e.target.value)}
                      />
                    </div>
                    <IconButton
                      variant="ghost"
                      size="md"
                      onClick={() => removeSlot(slot.key)}
                      disabled={slots.length <= 3}
                      aria-label={t("interview.hr.modal.remove_slot")}
                    >
                      <Trash2 />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <Button
                variant="ghost"
                size="sm"
                onClick={addSlot}
                disabled={slots.length >= 6}
                className="mt-1.5 self-start"
              >
                <Plus className="h-4 w-4" />
                {t("interview.hr.modal.add_slot")}
              </Button>
            </Field>

            {errMsg && <Alert tone="danger">{errMsg}</Alert>}

            <p className="data-mono text-[10.5px] tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
              {t("interview.hr.modal.expiry_hint")}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-6 py-2">
            <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-3 py-2.5">
              <div className="data-mono text-[10.5px] font-semibold tracking-[0.1em] text-[var(--color-text-subtle)] uppercase">
                {t("interview.hr.block.public_link")}
              </div>
              <div className="data-mono mt-0.5 truncate text-[13px] text-[var(--color-text)]">
                {publicUrl}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="primary" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? t("interview.hr.block.copied") : t("interview.hr.block.copy_link")}
              </Button>
              <Button asChild variant="secondary">
                <a
                  href={`https://t.me/share/url?url=${encodeURIComponent(publicUrl)}&text=${encodeURIComponent(t("interview.hr.share.telegram_body"))}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Send className="h-4 w-4" />
                  {t("interview.hr.block.send_telegram")}
                </a>
              </Button>
              <Button asChild variant="secondary">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(t("interview.hr.share.whatsapp_body") + " " + publicUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Send className="h-4 w-4" />
                  WhatsApp
                </a>
              </Button>
            </div>
            <Badge tone="success" variant="dot" className="self-start">
              {t("interview.hr.modal.confirmed_inline")}
            </Badge>
          </div>
        )}

        <DialogFooter>
          {!created ? (
            <>
              <Button variant="ghost" onClick={() => handleClose(false)} disabled={submitting}>
                {t("common.cancel")}
              </Button>
              <Button variant="accent" onClick={handleSubmit} loading={submitting}>
                <CalendarPlus className="h-4 w-4" />
                {t("interview.hr.modal.cta")}
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={() => handleClose(false)}>
              {t("common.cancel")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
