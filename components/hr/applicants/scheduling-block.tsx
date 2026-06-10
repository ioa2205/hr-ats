"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Check, Copy, X } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  LoadingState,
  Panel,
  PanelHeader,
  PanelTitle,
} from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import type { LocationKind } from "@/lib/interviews/validators";
import { ScheduleInterviewModal } from "./schedule-interview-modal";

type Status = "pending" | "booked" | "declined" | "cancelled" | "expired";

interface InterviewSummary {
  id: string;
  public_token: string;
  status: Status;
  duration_minutes: number;
  location_kind: LocationKind;
  location_detail: string | null;
  expires_at: string;
  booked_at: string | null;
  booked_start_at: string | null;
  candidate_note: string | null;
}

interface SchedulingBlockProps {
  candidateId: string;
  candidateName: string;
  appUrl: string;
}

const STATUS_KEYS: Record<Status, TranslationKey> = {
  pending: "interview.hr.status.pending",
  booked: "interview.hr.status.booked",
  declined: "interview.hr.status.declined",
  cancelled: "interview.hr.status.cancelled",
  expired: "interview.hr.status.expired",
};

function statusTone(s: Status): BadgeTone {
  if (s === "booked") return "success";
  if (s === "pending") return "info";
  if (s === "expired" || s === "cancelled") return "neutral";
  return "warning";
}

function defaultProposedSlots(): string[] {
  const now = new Date();
  const out: string[] = [];
  let day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0, 0);
  const hours = [10, 14, 16];
  let added = 0;
  while (added < 3) {
    const dow = day.getDay();
    if (dow !== 0 && dow !== 6) {
      const d = new Date(day);
      d.setHours(hours[added % hours.length], 0, 0, 0);
      out.push(d.toISOString());
      added += 1;
    }
    day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
  }
  return out;
}

export function SchedulingBlock({
  candidateId,
  candidateName,
  appUrl,
}: SchedulingBlockProps) {
  const { t, locale } = useTranslation();
  const [list, setList] = useState<InterviewSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<InterviewSummary | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hr/candidates/${candidateId}/interviews/list`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const body = (await res.json()) as { items: InterviewSummary[] };
        setList(body.items);
      } else {
        setList([]);
      }
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const proposed = useMemo(defaultProposedSlots, []);

  const handleCancel = useCallback(
    async (id: string) => {
      setActingId(id);
      try {
        const res = await fetch(`/api/hr/interviews/${id}/cancel`, { method: "POST" });
        if (res.ok) await refresh();
      } finally {
        setActingId(null);
        setCancelTarget(null);
      }
    },
    [refresh],
  );

  const handleCopyLink = useCallback(async (req: InterviewSummary) => {
    const url = `${appUrl}/interview/${req.public_token}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopiedId(req.id);
    window.setTimeout(() => {
      setCopiedId((prev) => (prev === req.id ? null : prev));
    }, 1600);
  }, [appUrl]);

  const fmtDateTime = useCallback(
    (iso: string) => new Date(iso).toLocaleString(locale === "uz" ? "ru" : locale, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
    [locale],
  );

  const activeRequest = list?.find((r) => r.status === "pending" || r.status === "booked");

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t("interview.hr.block.title")}</PanelTitle>
        {!loading && !activeRequest && (
          <Button variant="ghost" size="sm" onClick={() => setModalOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            {t("interview.hr.block.schedule_cta")}
          </Button>
        )}
      </PanelHeader>

      {loading && <LoadingState compact label={t("common.loading")} />}

      {!loading && (!list || list.length === 0) && (
        <div className="px-5 py-5 text-[12.5px] text-[var(--color-text-muted)]">
          {t("interview.hr.block.empty")}
        </div>
      )}

      {!loading && list && list.length > 0 && (
        <ul className="m-0 list-none p-0">
          {list.map((req) => (
            <li
              key={req.id}
              className="border-b border-[var(--color-line)] px-4 py-3 last:border-b-0 sm:px-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      tone={statusTone(req.status)}
                      variant={req.status === "booked" || req.status === "pending" ? "dot" : "default"}
                    >
                      {t(STATUS_KEYS[req.status])}
                    </Badge>
                    <span className="data-mono text-[10.5px] text-[var(--color-text-subtle)]">
                      {req.duration_minutes}{" "}
                      {t(`interview.duration_${req.duration_minutes as 15 | 30 | 45 | 60}`)}
                    </span>
                  </div>
                  {req.status === "booked" && req.booked_start_at && (
                    <div className="mt-1.5 text-[13px] font-semibold text-[var(--color-text)]">
                      {fmtDateTime(req.booked_start_at)}
                    </div>
                  )}
                  {req.status === "declined" && req.candidate_note && (
                    <div className="mt-1.5 text-[12.5px] text-[var(--color-text-muted)] italic">
                      “{req.candidate_note}”
                    </div>
                  )}
                  {(req.status === "pending" || req.status === "expired") && (
                    <div className="data-mono mt-1 text-[10.5px] text-[var(--color-text-subtle)]">
                      {t("interview.hr.block.expires_at", {
                        when: fmtDateTime(req.expires_at),
                      })}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {(req.status === "pending" || req.status === "booked") && (
                    <Button variant="ghost" size="sm" onClick={() => handleCopyLink(req)}>
                      {copiedId === req.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedId === req.id
                        ? t("interview.hr.block.copied")
                        : t("interview.hr.block.copy_link")}
                    </Button>
                  )}
                  {(req.status === "pending" || req.status === "booked") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCancelTarget(req)}
                      disabled={actingId === req.id}
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("interview.hr.block.cancel")}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ScheduleInterviewModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        candidateId={candidateId}
        candidateName={candidateName}
        appUrl={appUrl}
        defaultSlots={proposed}
        onCreated={() => {
          void refresh();
        }}
      />

      {/* Cancelling invalidates the candidate's link — confirm before acting. */}
      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(next) => {
          if (!next && actingId === null) setCancelTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("interview.hr.block.cancel_confirm_title")}</DialogTitle>
            <DialogDescription>{t("interview.hr.block.cancel_confirm_body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setCancelTarget(null)}
              disabled={actingId !== null}
            >
              {t("interview.hr.block.cancel_keep")}
            </Button>
            <Button
              variant="danger"
              onClick={() => cancelTarget && handleCancel(cancelTarget.id)}
              loading={actingId !== null}
            >
              <X className="h-4 w-4" />
              {t("interview.hr.block.cancel_confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {!loading && list && list.length > 0 && !activeRequest && (
        <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-4 py-3 sm:px-5">
          <Button variant="accent" size="sm" onClick={() => setModalOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            {t("interview.hr.block.schedule_again")}
          </Button>
        </div>
      )}
    </Panel>
  );
}
