"use client";

import { useCallback, useState } from "react";
import { CalendarPlus, Check, Loader2, X } from "lucide-react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Panel,
  PanelHeader,
  PanelTitle,
  Textarea,
} from "@/components/ui";
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

/** Calm terminal-state card (declined / cancelled / expired). */
function TerminalCard({ heading, body }: { heading: string; body: string }) {
  return (
    <Card>
      <div className="px-6 py-14 text-center sm:py-16">
        <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--color-text)]">
          {heading}
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[14px] leading-[1.55] text-[var(--color-text-muted)]">
          {body}
        </p>
      </div>
    </Card>
  );
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
          body.error === "expired" ? t("interview.expired_body") : t("interview.invalid_state"),
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
      <Card>
        <div className="flex flex-col items-center gap-5 px-6 py-12 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-container)]"
            style={{ animation: "pop 280ms cubic-bezier(0.2, 0, 0, 1.4)" }}
          >
            <Check className="h-8 w-8 text-[var(--color-success)]" strokeWidth={2.5} />
          </div>
          <div className="space-y-2">
            <h2 className="text-[24px] leading-[1.2] font-bold tracking-[-0.02em] text-[var(--color-text)] sm:text-[28px]">
              {t("interview.confirmed_heading")}
            </h2>
            <p className="mx-auto max-w-sm text-[14.5px] leading-[1.55] text-[var(--color-text-muted)]">
              {t("interview.confirmed_body")}
            </p>
          </div>
          <div className="w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-4 py-3 text-left">
            <div className="data-mono text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
              {t("interview.booked_at_label")}
            </div>
            <div className="mt-1 text-[16px] font-semibold text-[var(--color-text)]">{dateStr}</div>
            <div className="data-mono mt-0.5 text-[13.5px] text-[var(--color-text-muted)]">
              {timeStr} · {request.duration_minutes}{" "}
              {t(`interview.duration_${request.duration_minutes as 15 | 30 | 45 | 60}`)}
            </div>
            <div className="mt-2 text-[13px] text-[var(--color-text-muted)]">{locationLabel}</div>
          </div>
          <Button asChild variant="primary" size="lg" className="font-semibold">
            <a href={icsHref} download>
              <CalendarPlus className="h-4 w-4" aria-hidden="true" />
              {t("interview.add_to_calendar")}
            </a>
          </Button>
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
            @media (prefers-reduced-motion: reduce) {
              div {
                animation: none !important;
              }
            }
          `}</style>
        </div>
      </Card>
    );
  }

  // ── Terminal states ──
  if (request.status === "declined") {
    return (
      <TerminalCard heading={t("interview.decline_heading")} body={t("interview.declined_body")} />
    );
  }
  if (request.status === "cancelled") {
    return (
      <TerminalCard
        heading={t("interview.cancelled_heading")}
        body={t("interview.cancelled_body")}
      />
    );
  }
  if (isExpired) {
    return (
      <TerminalCard heading={t("interview.expired_heading")} body={t("interview.expired_body")} />
    );
  }

  // ── Declining: optional reason ──
  if (decliningView) {
    return (
      <Panel>
        <div className="flex flex-col gap-4 px-5 py-5 sm:px-6">
          <h2 className="text-[20px] font-semibold tracking-[-0.015em] text-[var(--color-text)]">
            {t("interview.decline_heading")}
          </h2>
          <Textarea
            label={t("interview.decline_reason_label")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            maxCharacters={300}
            currentLength={reason.length}
            rows={4}
            className="min-h-[100px]"
          />
          {errMsg && <Alert tone="danger">{errMsg}</Alert>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="ghost"
              size="lg"
              onClick={() => setDecliningView(false)}
              disabled={submitting}
            >
              {t("common.cancel")}
            </Button>
            <Button variant="primary" size="lg" onClick={handleDecline} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("interview.confirming")}
                </>
              ) : (
                t("interview.decline_submit")
              )}
            </Button>
          </div>
        </div>
      </Panel>
    );
  }

  // ── Pending: pick a slot ──
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            {request.company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={request.company.logo_url}
                alt=""
                className="h-11 w-11 rounded-[var(--radius-md)] border border-[var(--color-line)] object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-container)] text-[15px] font-semibold text-[var(--color-on-primary-container)]">
                {request.company.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <div className="data-mono text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
                {t("interview.eyebrow")}
              </div>
              <div className="truncate text-[14px] font-semibold tracking-[-0.005em] text-[var(--color-text)]">
                {request.company.name}
              </div>
            </div>
          </div>
          <h1 className="text-[24px] leading-[1.18] font-bold tracking-[-0.02em] text-[var(--color-text)] sm:text-[28px]">
            {jobTitle}
          </h1>
          <p className="text-[14.5px] leading-[1.55] text-[var(--color-text-muted)]">
            {t("interview.request_sub", { name: request.candidate_first_name })}
          </p>
          {request.hr_message && (
            <div className="mt-1 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-3.5 py-3 text-[14px] leading-[1.55] whitespace-pre-wrap text-[var(--color-text-muted)]">
              <div className="data-mono mb-1 text-[10.5px] font-semibold tracking-[0.1em] text-[var(--color-text-subtle)] uppercase">
                {t("interview.message_from_hr")}
              </div>
              {request.hr_message}
            </div>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge tone="neutral" size="md">
              {request.duration_minutes}{" "}
              {t(`interview.duration_${request.duration_minutes as 15 | 30 | 45 | 60}`)}
            </Badge>
            <Badge tone="neutral" size="md">
              {locationLabel}
            </Badge>
          </div>
        </div>
      </Card>

      <Panel>
        <PanelHeader>
          <PanelTitle>{t("interview.pick_a_time")}</PanelTitle>
        </PanelHeader>
        <div className="flex flex-col gap-3 px-5 py-5 sm:px-6">
          <p className="data-mono text-[10.5px] tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
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
          {errMsg && <Alert tone="danger">{errMsg}</Alert>}
          <div className="mt-1 flex flex-col gap-2">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!selectedId || submitting}
              onClick={handleConfirm}
              className="font-semibold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {t("interview.confirming")}
                </>
              ) : (
                t("interview.confirm_slot")
              )}
            </Button>
            <button
              type="button"
              onClick={() => {
                setErrMsg(null);
                setDecliningView(true);
              }}
              className="mx-auto inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-2 py-2 text-[13px] text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text)]"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              {t("interview.decline")}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
