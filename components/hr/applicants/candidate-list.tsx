"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronRight, RotateCw, Users } from "lucide-react";
import {
  AIFitScore,
  AnalysisStatus,
  Avatar,
  Button,
  Checkbox,
  EmptyState,
  Pagination,
} from "@/components/ui";
import { cn } from "@/lib/utils";
import { ScreenedOutAccordion } from "./screened-out-accordion";
import type { Candidate, RequirementResponses, RequirementSnapshot } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { buildMismatchSummary } from "@/lib/applicants/requirements-display";
import { candidateVerdict, relativeCandidateTime } from "@/lib/applicants/presentation";
import { CandidateStatusBadge } from "./candidate-status-badge";

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
  compareIds: string[];
  onToggleCompare: (candidate: Candidate) => void;
}

function getStatusLine(
  candidate: Candidate,
  t: (key: TranslationKey, vars?: Record<string, string>) => string,
  locale: Locale,
): string {
  if (candidate.status === "unscored") {
    return (
      buildMismatchSummary(
        candidate.requirements_snapshot as RequirementSnapshot | null,
        candidate.requirements_responses as RequirementResponses | null,
        locale,
        t,
      ) ?? t("applicants.status_line.below_requirements")
    );
  }
  if (candidate.status === "pending_analysis" || candidate.status === "analyzing") {
    return t("applicants.status_line.analyzing");
  }
  if (candidate.status === "analysis_failed") return t("applicants.status_line.analysis_failed");
  if (candidate.status === "invited") {
    return t("applicants.status_line.invited_prefix", {
      date: candidate.invited_at ? relativeCandidateTime(candidate.invited_at, t) : "",
    });
  }
  if (candidate.status === "rejected") return t("applicants.status.rejected");

  return pickLocalized(
    {
      ru: candidate.one_line_summary,
      uz: candidate.one_line_summary_uz,
      en: candidate.one_line_summary_en,
    },
    locale,
    candidate.one_line_summary ?? t("applicants.analysis.no_data"),
  );
}

function analysisStatus(candidate: Candidate) {
  if (candidate.status === "analysis_failed") return "failed" as const;
  if (candidate.status === "analyzing") return "processing" as const;
  return "queued" as const;
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
  compareIds,
  onToggleCompare,
}: CandidateListProps) {
  const { t, locale } = useTranslation();
  const parentRef = useRef<HTMLDivElement>(null);
  const useVirtual = candidates.length > 50;
  const virtualizer = useVirtualizer({
    count: candidates.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 92,
    enabled: useVirtual,
  });

  const renderRow = (candidate: Candidate, index: number) => {
    const selected = candidate.id === selectedId;
    const compared = compareIds.includes(candidate.id);
    const rank = (page - 1) * 25 + index + 1;
    const verdict = candidateVerdict(candidate);
    const statusLine = getStatusLine(candidate, t, locale);
    const isNew = candidate.status === "pending_analysis" || candidate.status === "analyzing";

    return (
      <div
        key={candidate.id}
        className={cn(
          "group flex min-h-[88px] items-stretch border-b border-[var(--color-line)] transition-colors last:border-b-0 hover:bg-[var(--color-surface-subtle)]",
          selected && "bg-[var(--color-primary-container)]",
        )}
      >
        <div className="flex w-10 shrink-0 items-center justify-center">
          <Checkbox
            checked={compared}
            onChange={() => onToggleCompare(candidate)}
            disabled={!compared && compareIds.length >= 3}
            aria-label={t("applicants.compare.select", { name: candidate.full_name })}
            className="min-h-0"
          />
        </div>
        <button
          type="button"
          onClick={() => onSelect(candidate.id)}
          aria-current={selected ? "true" : undefined}
          className="relative flex min-w-0 flex-1 items-center gap-3 px-2 py-3 text-left"
        >
          {selected && (
            <span
              className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[var(--color-primary)]"
              aria-hidden="true"
            />
          )}
          <span className="data-mono w-7 shrink-0 text-[11px] text-[var(--color-text-subtle)]">
            {String(rank).padStart(2, "0")}
          </span>
          <Avatar
            name={candidate.full_name}
            accent={verdict === "recommend" && index < 3}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[13px] font-bold tracking-[-0.008em] text-[var(--color-text)]">
                {candidate.full_name}
              </span>
              {isNew && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" aria-hidden />
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--color-text-muted)]">
              {statusLine}
            </p>
            <CandidateStatusBadge status={candidate.status} className="mt-1.5" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            {candidate.match_score !== null && candidate.status !== "unscored" ? (
              <AIFitScore
                score={candidate.match_score}
                label={t("applicants.analysis.ai_fit_score")}
                variant="compact"
              />
            ) : (
              <AnalysisStatus
                status={analysisStatus(candidate)}
                label={t(
                  candidate.status === "analysis_failed"
                    ? "applicants.analysis.status_failed"
                    : candidate.status === "analyzing"
                      ? "applicants.analysis.status_processing"
                      : "applicants.analysis.status_waiting",
                )}
              />
            )}
            <ChevronRight className="h-4 w-4 text-[var(--color-text-subtle)]" />
          </div>
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      {failedCount > 0 && (
        <div className="border-b border-[var(--color-line)] px-3 py-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetryAll}
            loading={retrying}
            disabled={retrying}
          >
            <RotateCw className="h-3.5 w-3.5" />
            {t("applicants.retry_all")}
          </Button>
        </div>
      )}

      <div
        ref={parentRef}
        aria-busy={loading}
        className={cn("min-h-0 flex-1 overflow-y-auto", loading && "opacity-60")}
      >
        {candidates.length === 0 ? (
          <EmptyState
            icon={<Users />}
            title={t("applicants.empty")}
            description={t("applicants.search_empty")}
          />
        ) : useVirtual ? (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((item) => (
              <div
                key={item.key}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: `${item.size}px`,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                {renderRow(candidates[item.index], item.index)}
              </div>
            ))}
          </div>
        ) : (
          candidates.map(renderRow)
        )}
      </div>

      {screenedOut.length > 0 && <ScreenedOutAccordion screenedOut={screenedOut} />}

      {totalPages > 1 && (
        <div className="flex justify-center border-t border-[var(--color-line)] px-3 py-2">
          <Pagination
            page={page}
            pageCount={totalPages}
            onPageChange={onPageChange}
            labels={{
              previous: t("common.previous"),
              next: t("common.next"),
            }}
          />
        </div>
      )}
    </div>
  );
}
