"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarPlus, Check, Copy, Loader2, X } from "lucide-react";
import { Panel, PanelHeader, PanelTitle, Pill, TezButton } from "@/components/hr/design";
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

function statusTone(s: Status) {
  if (s === "booked") return "success" as const;
  if (s === "pending") return "info" as const;
  if (s === "expired" || s === "cancelled") return "neutral" as const;
  return "amber" as const;
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
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="text-persimmon-2 hover:bg-persimmon-tint/60 flex items-center gap-1.5 rounded-[4px] border-none bg-transparent px-2 py-1 text-[12px] font-semibold transition-colors"
          >
            <CalendarPlus className="h-3 w-3" />
            {t("interview.hr.block.schedule_cta")}
          </button>
        )}
      </PanelHeader>

      {loading && (
        <div className="text-ink-4 flex items-center gap-2 px-5 py-5 text-[12.5px]">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("common.loading")}
        </div>
      )}

      {!loading && (!list || list.length === 0) && (
        <div className="text-ink-4 px-5 py-5 text-[12.5px]">
          {t("interview.hr.block.empty")}
        </div>
      )}

      {!loading && list && list.length > 0 && (
        <ul className="m-0 list-none p-0">
          {list.map((req) => (
            <li
              key={req.id}
              className="border-rule border-b px-5 py-3 last:border-b-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Pill tone={statusTone(req.status)} dot={req.status === "booked" || req.status === "pending"}>
                      {t(STATUS_KEYS[req.status])}
                    </Pill>
                    <span
                      className="text-ink-5 text-[10.5px]"
                      style={{ fontFamily: "var(--font-tez-mono)" }}
                    >
                      {req.duration_minutes}{" "}
                      {t(`interview.duration_${req.duration_minutes as 15 | 30 | 45 | 60}`)}
                    </span>
                  </div>
                  {req.status === "booked" && req.booked_start_at && (
                    <div className="text-ink mt-1.5 text-[13px] font-semibold">
                      {fmtDateTime(req.booked_start_at)}
                    </div>
                  )}
                  {req.status === "declined" && req.candidate_note && (
                    <div className="text-ink-4 mt-1.5 text-[12.5px] italic">
                      “{req.candidate_note}”
                    </div>
                  )}
                  {(req.status === "pending" || req.status === "expired") && (
                    <div
                      className="text-ink-5 mt-1 text-[10.5px]"
                      style={{ fontFamily: "var(--font-tez-mono)" }}
                    >
                      {t("interview.hr.block.expires_at", {
                        when: fmtDateTime(req.expires_at),
                      })}
                    </div>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {(req.status === "pending" || req.status === "booked") && (
                    <button
                      type="button"
                      onClick={() => handleCopyLink(req)}
                      className="text-ink-4 hover:bg-bone-2 hover:text-ink inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 text-[11.5px]"
                    >
                      {copiedId === req.id ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copiedId === req.id
                        ? t("interview.hr.block.copied")
                        : t("interview.hr.block.copy_link")}
                    </button>
                  )}
                  {(req.status === "pending" || req.status === "booked") && (
                    <button
                      type="button"
                      onClick={() => handleCancel(req.id)}
                      disabled={actingId === req.id}
                      className="text-ink-4 hover:bg-bone-2 hover:text-persimmon-2 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 text-[11.5px] disabled:opacity-40"
                    >
                      {actingId === req.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                      {t("interview.hr.block.cancel")}
                    </button>
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

      {!loading && list && list.length > 0 && !activeRequest && (
        <div className="border-rule bg-bone-2/40 border-t px-5 py-3">
          <TezButton
            variant="accent"
            size="md"
            onClick={() => setModalOpen(true)}
            leadingIcon={<CalendarPlus className="h-3 w-3" />}
          >
            {t("interview.hr.block.schedule_again")}
          </TezButton>
        </div>
      )}
    </Panel>
  );
}
