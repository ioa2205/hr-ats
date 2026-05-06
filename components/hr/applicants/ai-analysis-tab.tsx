"use client";

import { useCallback, useState } from "react";
import { CheckCircle, AlertTriangle, Globe, RotateCw, Flag, Sparkles } from "lucide-react";
import { Badge, Button, Card, CardContent, Skeleton } from "@/components/ui";
import { ScoreCircle } from "./score-circle";
import { InterviewQuestionsBlock } from "./interview-questions-block";
import { SchedulingBlock } from "./scheduling-block";
import type {
  Candidate,
  RequirementResponses,
  RequirementSnapshot,
} from "@/types";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { pickLocalized, pickLocalizedArray } from "@/lib/i18n/pick-localized";
import { buildRequirementsTable } from "@/lib/applicants/requirements-display";

interface AiAnalysisTabProps {
  candidate: Candidate;
  jobTitle: string;
  appUrl: string;
  onUpdate: (id: string, updates: Partial<Candidate>) => void;
}

const languageLabelKey: Record<string, TranslationKey> = {
  ru: "onboarding.locale_ru",
  uz: "onboarding.locale_uz",
  en: "onboarding.locale_en",
  other: "applicants.analysis.language_other",
};

export function AiAnalysisTab({ candidate, jobTitle, appUrl, onUpdate }: AiAnalysisTabProps) {
  const { t, locale } = useTranslation();
  const [retrying, setRetrying] = useState(false);
  const [analyzingAnyway, setAnalyzingAnyway] = useState(false);
  const [analyzeAnywayError, setAnalyzeAnywayError] = useState<string | null>(null);

  const localizedSummary = pickLocalized(
    {
      ru: candidate.one_line_summary,
      uz: candidate.one_line_summary_uz,
      en: candidate.one_line_summary_en,
    },
    locale,
    candidate.one_line_summary ?? "",
  );
  const localizedStrengths = pickLocalizedArray(
    {
      ru: candidate.strengths,
      uz: candidate.strengths_uz,
      en: candidate.strengths_en,
    },
    locale,
    candidate.strengths ?? [],
  );
  const localizedGaps = pickLocalizedArray(
    {
      ru: candidate.gaps,
      uz: candidate.gaps_uz,
      en: candidate.gaps_en,
    },
    locale,
    candidate.gaps ?? [],
  );

  const handleRetry = useCallback(async () => {
    setRetrying(true);
    try {
      const res = await fetch(`/api/hr/candidates/${candidate.id}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        onUpdate(candidate.id, {
          status: "pending_analysis",
          ai_error: null,
        });
      }
    } finally {
      setRetrying(false);
    }
  }, [candidate.id, onUpdate]);

  const handleAnalyzeAnyway = useCallback(async () => {
    setAnalyzingAnyway(true);
    setAnalyzeAnywayError(null);
    try {
      const res = await fetch(`/api/hr/candidates/${candidate.id}/analyze-anyway`, {
        method: "POST",
      });
      if (res.ok) {
        onUpdate(candidate.id, {
          status: "pending_analysis",
          ai_error: null,
        });
        return;
      }
      if (res.status === 429) {
        setAnalyzeAnywayError(t("applicants.requirements.analyze_anyway_quota"));
      } else {
        setAnalyzeAnywayError(t("common.error"));
      }
    } catch {
      setAnalyzeAnywayError(t("common.error"));
    } finally {
      setAnalyzingAnyway(false);
    }
  }, [candidate.id, onUpdate, t]);

  // ── Unscored: candidate didn't meet hard requirements ────────
  // CV is uploaded but AI was skipped to save quota. HR can review the CV
  // and either move on or click "Analyze with AI anyway" to spend a credit.
  if (candidate.status === "unscored") {
    const rows = buildRequirementsTable(
      candidate.requirements_snapshot as RequirementSnapshot | null,
      candidate.requirements_responses as RequirementResponses | null,
      locale,
      t,
    );
    const unmet = rows.filter((r) => !r.met);
    return (
      <div className="border-danger/30 bg-danger-container/30 space-y-4 rounded-[var(--radius-lg)] border p-4">
        <div className="flex items-start gap-3">
          <Flag className="text-danger mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-2">
            <p className="text-danger text-sm font-medium">
              {t("applicants.status_line.below_requirements")}
            </p>
            <p className="text-on-surface-variant text-xs">
              {t("applicants.requirements.analyze_anyway_intro")}
            </p>
          </div>
        </div>
        {unmet.length > 0 && (
          <ul className="space-y-1.5 pl-8">
            {unmet.map((row) => (
              <li
                key={row.id}
                className="text-on-surface flex items-baseline justify-between gap-3 text-xs"
              >
                <span className="truncate font-medium">{row.label}</span>
                <span className="text-on-surface-variant shrink-0">
                  {t("applicants.requirements.required_label")}: {row.requiredText}
                  <span className="text-danger ml-2">
                    {t("applicants.requirements.candidate_answer")}: {row.answerText}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
        {analyzeAnywayError && (
          <p className="text-danger pl-8 text-xs" role="alert">
            {analyzeAnywayError}
          </p>
        )}
        <div className="pl-8">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleAnalyzeAnyway}
            disabled={analyzingAnyway}
            loading={analyzingAnyway}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t("applicants.requirements.analyze_anyway")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Pending / Analyzing skeleton ──────────────────────────────
  if (candidate.status === "pending_analysis" || candidate.status === "analyzing") {
    const isRateLimited =
      candidate.status === "pending_analysis" && candidate.ai_error === "rate_limited";
    return (
      <div className="space-y-6">
        {isRateLimited && (
          <div className="border-warning/40 bg-warning-container/30 flex items-start gap-3 rounded-[var(--radius-lg)] border p-4">
            <AlertTriangle className="text-warning mt-0.5 h-5 w-5 shrink-0" />
            <div className="space-y-1">
              <p className="text-on-surface text-sm font-medium">
                {t("applicants.analysis.rate_limited_heading")}
              </p>
              <p className="text-on-surface-variant text-xs">
                {t("applicants.analysis.rate_limited_body")}
              </p>
            </div>
          </div>
        )}
        <div className="flex justify-center">
          <Skeleton variant="circle" width={120} height={120} />
        </div>
        <Skeleton className="mx-auto h-4 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // ── Failed ────────────────────────────────────────────────────
  if (candidate.status === "analysis_failed") {
    return (
      <div className="border-danger/30 bg-danger-container/30 rounded-[var(--radius-lg)] border p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="text-danger mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-2">
            <p className="text-danger text-sm font-medium">
              {t("applicants.analysis.failed_heading")}
            </p>
            {candidate.ai_error && (
              <p className="text-on-surface-variant text-xs">{candidate.ai_error.slice(0, 200)}</p>
            )}
            {candidate.retry_count < 3 ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRetry}
                disabled={retrying}
                loading={retrying}
              >
                <RotateCw className="h-3.5 w-3.5" />
                {t("applicants.analysis.retry")}
              </Button>
            ) : (
              <p className="text-on-surface-variant text-xs font-medium">
                {t("applicants.analysis.max_retries")}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Analyzed (or invited — they have analysis data) ───────────
  if (candidate.status !== "analyzed" && candidate.status !== "invited") {
    return (
      <p className="text-on-surface-variant py-8 text-center text-sm">
        {t("applicants.analysis.no_data")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Score circle */}
      {candidate.match_score !== null && (
        <div className="flex justify-center">
          <ScoreCircle score={candidate.match_score} />
        </div>
      )}

      {/* Language badge */}
      {candidate.language_detected && (
        <div className="flex items-center justify-center gap-2">
          <Globe className="text-on-surface-variant h-4 w-4" />
          <Badge tone="neutral" size="sm">
            {languageLabelKey[candidate.language_detected]
              ? t(languageLabelKey[candidate.language_detected])
              : candidate.language_detected}
          </Badge>
        </div>
      )}

      {/* Summary */}
      {localizedSummary && (
        <Card>
          <CardContent className="py-3">
            <p className="text-on-surface-variant text-sm">{localizedSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* Strengths and Gaps */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Strengths */}
        <div className="space-y-2">
          <div className="text-success flex items-center gap-1.5 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            {t("applicants.analysis.strengths")}
          </div>
          {localizedStrengths.length > 0 ? (
            <ul className="space-y-1.5">
              {localizedStrengths.map((s, i) => (
                <li key={i} className="text-on-surface flex items-start gap-2 text-sm">
                  <span className="bg-success mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                  {s}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-on-surface-variant text-xs">
              {t("applicants.analysis.none_identified")}
            </p>
          )}
        </div>

        {/* Gaps */}
        <div className="space-y-2">
          <div className="text-warning flex items-center gap-1.5 text-sm font-medium">
            <AlertTriangle className="h-4 w-4" />
            {t("applicants.analysis.gaps")}
          </div>
          {localizedGaps.length > 0 ? (
            <ul className="space-y-1.5">
              {localizedGaps.map((g, i) => (
                <li key={i} className="text-on-surface flex items-start gap-2 text-sm">
                  <span className="bg-warning mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" />
                  {g}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-on-surface-variant text-xs">
              {t("applicants.analysis.none_identified")}
            </p>
          )}
        </div>
      </div>

      <InterviewQuestionsBlock
        candidateId={candidate.id}
        candidateName={candidate.full_name}
        jobTitle={jobTitle}
        initial={candidate.ai_interview_questions}
        ready={candidate.status === "analyzed" || candidate.status === "invited"}
      />

      <SchedulingBlock
        candidateId={candidate.id}
        candidateName={candidate.full_name}
        appUrl={appUrl}
      />
    </div>
  );
}
