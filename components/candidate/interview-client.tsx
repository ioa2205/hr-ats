"use client";

import { useCallback, useState } from "react";
import { CalendarPlus, Check, Loader2, X } from "lucide-react";
import { Panel, Pill, TezButton } from "@/components/hr/design";
import { useTranslation } from "@/lib/i18n/provider";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import type { LocationKind } from "@/lib/interviews/validators";
import { SlotPicker } from "./slot-picker";

interface PublicInterview {
  id: string;
  public_token: string;
  status: "pending" | "booked" | "declined" | "cancelled" | "expired";
  duration_minutes: number;
  location_kind: LocationKind;
  location_detail: string | null;
  hr_message: string | null;
  candidate_note: string | null;
  expires_at: string;
  booked_slot_id: string | null;
  booked_at: string | null;
  booked_start_at: string | null;
  slots: { id: string; start_at: string; position: number }[];
  candidate_first_name: string;
  job: {
    title: string;
    title_ru: string | null;
    title_uz: string | null;
    title_en: string | null;
  };
  company: { name: string; logo_url: string | null; default_locale: string };
}

interface InterviewClientProps {
  initial: PublicInterview;
  jobTitle: string;
  locale: Locale;
}

const LOCATION_LABEL_KEYS: Record<LocationKind, TranslationKey> = {
  google_meet: "interview.location.google_meet",
  telegram: "interview.location.telegram",
  phone: "interview.location.phone",
  office: "interview.location.office",
  custom: "interview.location.custom",
};

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function InterviewClient({ initial, jobTitle, locale }: InterviewClientProps) {
  const { t } = useTranslation();
  const [request, setRequest] = useState<PublicInterview>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [decliningView, setDecliningView] = useState(false);
  const [reason, setReason] = useState("");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const isExpired =
    request.status === "expired" || new Date(request.expires_at).getTime() < Date.now();

  const handleConfirm = useCallback(async () => {
    if (!selectedId) return;
    setSubmitting(true);
    setErrMsg(null);
    try {
      const res = await fetch(`/api/interviews/public/${request.public_token}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: selectedId }),
      });
      if (res.ok) {
        const slot = request.slots.find((s) => s.id === selectedId);
        setRequest({
          ...request,
          status: "booked",
          booked_slot_id: selectedId,
          booked_start_at: slot?.start_at ?? null,
          booked_at: new Date().toISOString(),
        });
        return;
      }
      if (res.status === 409 || res.status === 404) {
        const body = await res.json().catch(() => ({}));
        setErrMsg(
          body.error === "expired"
            ? t("interview.expired_body")
            : t("interview.invalid_state"),
        );
        return;
      }
      setErrMsg(t("interview.book_error"));
    } catch {
      setErrMsg(t("interview.book_error"));
    } finally {
      setSubmitting(false);
    }
  }, [request, selectedId, t]);

  const handleDecline = useCallback(async () => {
    setSubmitting(true);
    setErrMsg(null);
    try {
      const res = await fetch(`/api/interviews/public/${request.public_token}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || null }),
      });
      if (res.ok) {
        setRequest({ ...request, status: "declined", candidate_note: reason.trim() || null });
        setDecliningView(false);
        return;
      }
      setErrMsg(t("interview.decline_error"));
    } catch {
      setErrMsg(t("interview.decline_error"));
    } finally {
      setSubmitting(false);
    }
  }, [reason, request, t]);

  const locationLabel = (() => {
    const base = t(LOCATION_LABEL_KEYS[request.location_kind]);
    return request.location_detail ? `${base} — ${request.location_detail}` : base;
  })();

  // ── Booked state ──
  if (request.status === "booked" && request.booked_start_at) {
    const start = new Date(request.booked_start_at);
    const dateStr = start.toLocaleDateString(locale === "uz" ? "ru" : locale, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    const timeStr = `${pad2(start.getHours())}:${pad2(start.getMinutes())}`;
    const icsHref = `/api/interviews/public/${request.public_token}/calendar.ics`;
    return (
      <Panel>
        <div className="flex flex-col items-center gap-5 px-6 py-12 text-center">
          <div
            className="bg-persimmon-tint flex h-16 w-16 items-center justify-center rounded-full"
            style={{ animation: "pop 280ms cubic-bezier(0.2, 0, 0, 1.4)" }}
          >
            <Check className="text-persimmon-2 h-8 w-8" strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-ink text-[24px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[28px]">
              {t("interview.confirmed_heading")}
            </h2>
            <p className="text-ink-3 mx-auto max-w-sm text-[14.5px] leading-[1.55]">
              {t("interview.confirmed_body")}
            </p>
          </div>
          <div className="border-rule bg-bone-2/60 w-full max-w-sm rounded-[8px] border px-4 py-3 text-left">
            <div
              className="text-ink-5 text-[10.5px] font-semibold uppercase tracking-[0.12em]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
              {t("interview.booked_at_label")}
            </div>
            <div className="text-ink mt-1 text-[16px] font-semibold">{dateStr}</div>
            <div
              className="text-ink-3 mt-0.5 text-[13.5px]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
              {timeStr} · {request.duration_minutes}{" "}
              {t(`interview.duration_${request.duration_minutes as 15 | 30 | 45 | 60}`)}
            </div>
            <div className="text-ink-4 mt-2 text-[13px]">{locationLabel}</div>
          </div>
          <a href={icsHref} download>
            <TezButton
              variant="accent"
              size="lg"
              className="h-12 px-5 text-[14.5px] font-semibold"
              leadingIcon={<CalendarPlus className="h-3.5 w-3.5" />}
            >
              {t("interview.add_to_calendar")}
            </TezButton>
          </a>
          <style jsx>{`
            @keyframes pop {
              0% {
                transform: scale(0.6);
                opacity: 0;
              }
              100% {
                transform: scale(1);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      </Panel>
    );
  }

  // ── Terminal states ──
  if (request.status === "declined") {
    return (
      <Panel>
        <div className="px-6 py-12 text-center">
          <h2 className="text-ink text-[22px] font-bold tracking-[-0.02em]">
            {t("interview.decline_heading")}
          </h2>
          <p className="text-ink-3 mx-auto mt-2 max-w-sm text-[14px]">
            {t("interview.declined_body")}
          </p>
        </div>
      </Panel>
    );
  }
  if (request.status === "cancelled") {
    return (
      <Panel>
        <div className="px-6 py-12 text-center">
          <h2 className="text-ink text-[22px] font-bold tracking-[-0.02em]">
            {t("interview.cancelled_heading")}
          </h2>
          <p className="text-ink-3 mx-auto mt-2 max-w-sm text-[14px]">
            {t("interview.cancelled_body")}
          </p>
        </div>
      </Panel>
    );
  }
  if (isExpired) {
    return (
      <Panel>
        <div className="px-6 py-12 text-center">
          <h2 className="text-ink text-[22px] font-bold tracking-[-0.02em]">
            {t("interview.expired_heading")}
          </h2>
          <p className="text-ink-3 mx-auto mt-2 max-w-sm text-[14px]">
            {t("interview.expired_body")}
          </p>
        </div>
      </Panel>
    );
  }

  // ── Pending: pick a slot ──
  if (decliningView) {
    return (
      <Panel>
        <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
          <h2 className="text-ink text-[20px] font-semibold tracking-[-0.015em]">
            {t("interview.decline_heading")}
          </h2>
          <label className="flex flex-col gap-1.5">
            <span className="text-ink text-[13px] font-semibold">
              {t("interview.decline_reason_label")}
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              rows={4}
              className="border-rule bg-paper text-ink placeholder:text-ink-5 focus:border-ink min-h-[100px] w-full resize-none rounded-[6px] border px-3 py-2 text-[14px] focus:outline-none"
            />
            <span
              className="text-ink-5 self-end text-[10.5px]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
              {reason.length}/300
            </span>
          </label>
          <div className="flex justify-end gap-2">
            <TezButton
              variant="ghost"
              onClick={() => setDecliningView(false)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </TezButton>
            <TezButton variant="primary" onClick={handleDecline} disabled={submitting}>
              {submitting ? t("interview.confirming") : t("interview.decline_submit")}
            </TezButton>
          </div>
          {errMsg && (
            <div className="border-persimmon bg-persimmon-tint text-persimmon-2 rounded-[5px] border px-3 py-2 text-[13px]">
              {errMsg}
            </div>
          )}
        </div>
      </Panel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <div className="flex flex-col gap-3 px-5 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            {request.company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={request.company.logo_url}
                alt=""
                className="border-rule h-10 w-10 rounded-[5px] border object-cover"
              />
            ) : (
              <div className="bg-ink text-paper flex h-10 w-10 items-center justify-center rounded-[5px] text-[13px] font-semibold">
                {request.company.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="leading-tight">
              <div
                className="text-ink-4 text-[10.5px] font-semibold uppercase tracking-[0.12em]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {t("interview.eyebrow")}
              </div>
              <div className="text-ink text-[14px] font-semibold tracking-[-0.005em]">
                {request.company.name}
              </div>
            </div>
          </div>
          <h1 className="text-ink text-[26px] font-bold leading-[1.18] tracking-[-0.02em] sm:text-[28px]">
            {jobTitle}
          </h1>
          <p className="text-ink-3 text-[14.5px] leading-[1.55]">
            {t("interview.request_sub", { name: request.candidate_first_name })}
          </p>
          {request.hr_message && (
            <div className="border-rule bg-bone-2/60 mt-1 whitespace-pre-wrap rounded-[6px] border px-3.5 py-3 text-[14px] leading-[1.55] text-ink-2">
              <div
                className="text-ink-5 mb-1 text-[10.5px] font-semibold uppercase tracking-[0.1em]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {t("interview.message_from_hr")}
              </div>
              {request.hr_message}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Pill tone="neutral">
              {request.duration_minutes}{" "}
              {t(`interview.duration_${request.duration_minutes as 15 | 30 | 45 | 60}`)}
            </Pill>
            <Pill tone="neutral">{locationLabel}</Pill>
          </div>
        </div>
      </Panel>

      <Panel>
        <div className="flex flex-col gap-3 px-5 py-5 sm:px-6">
          <h2 className="text-ink text-[18px] font-semibold tracking-[-0.015em]">
            {t("interview.pick_a_time")}
          </h2>
          <p
            className="text-ink-5 text-[10.5px] uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            {t("interview.timezone_note")}
          </p>
          <SlotPicker
            slots={request.slots}
            durationMinutes={request.duration_minutes}
            selectedId={selectedId}
            onSelect={setSelectedId}
            locale={locale}
            disabled={submitting}
          />
          {errMsg && (
            <div className="border-persimmon bg-persimmon-tint text-persimmon-2 rounded-[6px] border px-3 py-2 text-[13px] font-medium">
              {errMsg}
            </div>
          )}
          <div className="mt-2 flex flex-col gap-2">
            <TezButton
              variant="accent"
              size="lg"
              disabled={!selectedId || submitting}
              onClick={handleConfirm}
              className="h-12 w-full justify-center text-[14.5px] font-semibold"
              leadingIcon={
                submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined
              }
            >
              {submitting ? t("interview.confirming") : t("interview.confirm_slot")}
            </TezButton>
            <button
              type="button"
              onClick={() => {
                setErrMsg(null);
                setDecliningView(true);
              }}
              className="text-ink-4 hover:text-ink mx-auto inline-flex items-center gap-1 rounded-[4px] px-2 py-1 text-[12.5px]"
            >
              <X className="h-3 w-3" />
              {t("interview.decline")}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
