"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, RotateCw } from "lucide-react";
import { Avatar, ScoreMini, VerdictPill, TezButton } from "@/components/hr/design";
import { cn } from "@/lib/utils";
import { relativeDate } from "@/lib/time";
import { ScreenedOutAccordion } from "./screened-out-accordion";
import type {
  Candidate,
  RequirementResponses,
  RequirementSnapshot,
} from "@/types";
import { useTranslation } from "@/lib/i18n/provider";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { buildMismatchSummary } from "@/lib/applicants/requirements-display";

interface CandidateListProps {
  candidates: Candidate[];
  screenedOut: Pick<Candidate, "id" | "full_name" | "created_at" | "status">[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  loading: boolean;
  failedCount: number;
  retrying: boolean;
  onRetryAll: () => void;
}

function verdictOf(c: Candidate): "recommend" | "review" | "reject" | "mismatch" | "none" {
  if (c.status === "unscored") return "mismatch";
  if (c.status === "rejected_screening") return "reject";
  const s = c.match_score ?? -1;
  if (s < 0) return "none";
  if (s >= 80 && (c.status === "analyzed" || c.status === "invited")) return "recommend";
  if (s >= 60 && s < 80) return "review";
  if (s < 60 && c.status === "analyzed") return "reject";
  return "none";
}

function getStatusLine(
  c: Candidate,
  t: (k: TranslationKey, vars?: Record<string, string>) => string,
  locale: Locale,
): { text: string; tone: "muted" | "warn" | "danger" | "ok" } {
  switch (c.status) {
    case "analyzed": {
      const summary = pickLocalized(
        {
          ru: c.one_line_summary,
          uz: c.one_line_summary_uz,
          en: c.one_line_summary_en,
        },
        locale,
        c.one_line_summary ?? "",
      );
      return {
        text: summary ? summary.slice(0, 72) : t("applicants.status.analyzed"),
        tone: "muted",
      };
    }
    case "pending_analysis":
    case "analyzing":
      return { text: t("applicants.status_line.analyzing"), tone: "warn" };
    case "analysis_failed":
      return { text: t("applicants.status_line.analysis_failed"), tone: "danger" };
    case "invited":
      return {
        text: t("applicants.status_line.invited_prefix", {
          date: c.invited_at ? relativeDate(c.invited_at) : "",
        }),
        tone: "ok",
      };
    case "unscored": {
      // Show the specific gaps inline so HR can scan the list without opening
      // the detail panel. Falls back to a generic label when we can't compute.
      const summary = buildMismatchSummary(
        c.requirements_snapshot as RequirementSnapshot | null,
        c.requirements_responses as RequirementResponses | null,
        locale,
        t,
      );
      return {
        text: summary ?? t("applicants.status_line.below_requirements"),
        tone: "danger",
      };
    }
    case "rejected":
      return { text: t("applicants.status.rejected"), tone: "muted" };
    default:
      return { text: c.status, tone: "muted" };
  }
}

export function CandidateList({
  candidates,
  screenedOut,
  selectedId,
  onSelect,
  page,
  totalPages,
  onPageChange,
  loading,
  failedCount,
  retrying,
  onRetryAll,
}: CandidateListProps) {
  const { t, locale } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);
  const useVirtual = candidates.length > 50;
  const virtualizer = useVirtualizer({
    count: candidates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    enabled: useVirtual,
  });

  const retryButton = failedCount > 0 && (
    <div className="border-rule border-b px-4 py-2">
      <TezButton
        variant="secondary"
        size="sm"
        onClick={onRetryAll}
        disabled={retrying}
        leadingIcon={<RotateCw className="h-3 w-3" />}
      >
        {t("applicants.retry_all")}
      </TezButton>
    </div>
  );

  const renderRow = (c: Candidate, index: number) => {
    const selected = c.id === selectedId;
    const rank = (page - 1) * 25 + index + 1;
    const v = verdictOf(c);
    const statusLine = getStatusLine(c, t, locale);
    const isNew = c.status === "pending_analysis" || c.status === "analyzing";

    return (
      <button
        key={c.id}
        onClick={() => onSelect(c.id)}
        className={cn(
          "border-rule hover:bg-bone flex w-full items-center gap-3 border-b px-3.5 py-2.5 text-left transition-colors last:border-b-0",
          selected && "bg-bone-2",
        )}
      >
        {selected && (
          <span
            className="bg-ink -ml-3.5 h-[52px] w-[3px] shrink-0 rounded-r-[1px]"
            aria-hidden
          />
        )}
        <span
          className="text-ink-5 w-7 shrink-0 text-[11px]"
          style={{ fontFamily: "var(--font-tez-mono)" }}
        >
          {String(rank).padStart(2, "0")}
        </span>
        <Avatar
          name={c.full_name}
          persimmon={v === "recommend" && index < 3}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-ink truncate text-[12.5px] font-semibold tracking-[-0.008em]">
              {c.full_name}
            </span>
            {isNew && (
              <span
                className="bg-persimmon h-[5px] w-[5px] shrink-0 rounded-full"
                aria-hidden
              />
            )}
          </div>
          <div
            className={cn(
              "mt-[1px] truncate text-[11px]",
              statusLine.tone === "muted" && "text-ink-4",
              statusLine.tone === "warn" && "text-[color:var(--color-tez-amber)]",
              statusLine.tone === "danger" && "text-[color:var(--color-tez-red)]",
              statusLine.tone === "ok" && "text-[color:var(--color-tez-green)]",
            )}
          >
            {statusLine.text}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {v !== "none" && (
            <VerdictPill
              verdict={v}
              labels={{
                recommend: t("hr.applicants.verdict.recommend"),
                review: t("hr.applicants.verdict.review"),
                reject: t("hr.applicants.verdict.reject"),
                mismatch: t("hr.applicants.verdict.mismatch"),
              }}
            />
          )}
          {c.match_score !== null && c.status !== "unscored" && (
            <ScoreMini score={c.match_score} persimmon={v === "recommend"} />
          )}
        </div>
        <ChevronRight className="text-ink-5 h-4 w-4 shrink-0" />
      </button>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {retryButton}

      <div ref={parentRef} className="min-h-0 flex-1 overflow-y-auto">
        {candidates.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <p className="text-ink-5 text-sm">{t("applicants.empty")}</p>
          </div>
        ) : useVirtual ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((vi) => (
              <div
                key={vi.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${vi.size}px`,
                  transform: `translateY(${vi.start}px)`,
                }}
              >
                {renderRow(candidates[vi.index], vi.index)}
              </div>
            ))}
          </div>
        ) : (
          candidates.map((c, i) => renderRow(c, i))
        )}
      </div>

      {screenedOut.length > 0 && <ScreenedOutAccordion screenedOut={screenedOut} />}

      {totalPages > 1 && (
        <div className="border-rule flex items-center justify-between border-t px-3.5 py-2">
          <TezButton
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || loading}
          >
            {t("common.previous")}
          </TezButton>
          <span
            className="text-ink-5 text-[11px]"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            {page} / {totalPages}
          </span>
          <TezButton
            variant="ghost"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || loading}
          >
            {t("common.next")}
          </TezButton>
        </div>
      )}
    </div>
  );
}
