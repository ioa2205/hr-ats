"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Globe, RotateCw, Flag, Sparkles } from "lucide-react";
import {
  AIAssessmentLabel,
  AIFitScore,
  Alert,
  AnalysisStatus,
  AssessmentList,
  AssessmentRow,
  Badge,
  Button,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  Skeleton,
} from "@/components/ui";
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

// ai_error holds a controlled marker (set by process-cv), never a raw provider
// message — that previously leaked the Gemini API key into this UI. Map known
// markers to localized copy; anything unrecognized falls back to a generic
// message so a raw string can never be rendered.
const aiErrorKey: Record<string, TranslationKey> = {
  ai_unavailable: "applicants.analysis.err_unavailable",
  "AI timeout": "applicants.analysis.err_timeout",
  "Job posting not found": "applicants.analysis.err_job_missing",
  "Failed to access CV file": "applicants.analysis.err_cv_access",
  ai_error: "applicants.analysis.err_generic",
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
  const requirementRows = buildRequirementsTable(
    candidate.requirements_snapshot as RequirementSnapshot | null,
    candidate.requirements_responses as RequirementResponses | null,
    locale,
    t,
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
    const unmet = requirementRows.filter((r) => !r.met);
    return (
      <Alert
        tone="warning"
        title={t("applicants.status_line.below_requirements")}
        action={
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
        }
      >
        <div className="space-y-3">
          <p>{t("applicants.requirements.analyze_anyway_intro")}</p>
          {unmet.length > 0 && (
            <AssessmentList>
              {unmet.map((row) => (
                <AssessmentRow key={row.id} kind="requirement-unmet">
                  <span className="font-medium">{row.label}</span>
                  <span className="mt-0.5 block text-xs">
                    {t("applicants.requirements.required_label")}: {row.requiredText}.{" "}
                    {t("applicants.requirements.candidate_answer")}: {row.answerText}
                  </span>
                </AssessmentRow>
              ))}
            </AssessmentList>
          )}
          {analyzeAnywayError && (
            <p className="text-xs text-[var(--color-danger)]" role="alert">
              {analyzeAnywayError}
            </p>
          )}
        </div>
      </Alert>
    );
  }

  // ── Pending / Analyzing skeleton ──────────────────────────────
  if (candidate.status === "pending_analysis" || candidate.status === "analyzing") {
    const isRateLimited =
      candidate.status === "pending_analysis" && candidate.ai_error === "rate_limited";
    const isUnavailable =
      candidate.status === "pending_analysis" && candidate.ai_error === "ai_unavailable";
    return (
      <div className="space-y-6">
        <div className="flex justify-center">
          <AnalysisStatus
            status={candidate.status === "analyzing" ? "processing" : "queued"}
            label={t(
              candidate.status === "analyzing"
                ? "applicants.analysis.status_processing"
                : "applicants.analysis.status_waiting",
            )}
          />
        </div>
        {isRateLimited && (
          <div className="border-warning/40 bg-warning-container/30 flex items-start gap-3 rounded-[var(--radius-lg)] border p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" />
            <div className="space-y-1">
              <p className="text-[var(--color-text)] text-sm font-medium">
                {t("applicants.analysis.rate_limited_heading")}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t("applicants.analysis.rate_limited_body")}
              </p>
            </div>
          </div>
        )}
        {isUnavailable && (
          <div className="border-warning/40 bg-warning-container/30 flex items-start gap-3 rounded-[var(--radius-lg)] border p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-warning)]" />
            <div className="space-y-1">
              <p className="text-[var(--color-text)] text-sm font-medium">
                {t("applicants.analysis.unavailable_heading")}
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {t("applicants.analysis.unavailable_body")}
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
      <Alert
        tone="danger"
        title={t("applicants.analysis.failed_heading")}
        action={
          candidate.retry_count < 3 ? (
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
          ) : undefined
        }
      >
        <div className="space-y-2">
            {candidate.ai_error && (
              <p className="text-xs">
                {t(aiErrorKey[candidate.ai_error] ?? "applicants.analysis.err_generic")}
              </p>
            )}
            {candidate.retry_count >= 3 && (
              <p className="text-xs font-medium">
                {t("applicants.analysis.max_retries")}
              </p>
            )}
        </div>
      </Alert>
    );
  }

  // ── Analyzed (or invited — they have analysis data) ───────────
  if (candidate.status !== "analyzed" && candidate.status !== "invited") {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-text-muted)]">
        {t("applicants.analysis.no_data")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <Panel className="border-[var(--color-primary)]">
        <PanelBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {candidate.match_score !== null && (
            <AIFitScore
              score={candidate.match_score}
              label={t("applicants.analysis.ai_fit_score")}
            />
          )}
          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <AIAssessmentLabel>{t("applicants.analysis.advisory_label")}</AIAssessmentLabel>
              <AnalysisStatus
                status="complete"
                label={t("applicants.analysis.status_ready")}
              />
              {candidate.language_detected && (
                <Badge tone="neutral" size="sm">
                  <Globe className="h-3.5 w-3.5" />
                  {languageLabelKey[candidate.language_detected]
                    ? t(languageLabelKey[candidate.language_detected])
                    : candidate.language_detected}
                </Badge>
              )}
            </div>
            <p className="text-xs leading-5 text-[var(--color-text-muted)]">
              {t("applicants.analysis.advisory_note")}
            </p>
            {localizedSummary && (
              <div>
                <p className="mb-1 text-xs font-bold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
                  {t("applicants.analysis.evidence")}
                </p>
                <p className="text-sm leading-6 text-[var(--color-text)]">{localizedSummary}</p>
              </div>
            )}
          </div>
        </PanelBody>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t("applicants.analysis.strengths")}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            {localizedStrengths.length > 0 ? (
              <AssessmentList>
                {localizedStrengths.map((strength, index) => (
                  <AssessmentRow key={index} kind="strength">
                    {strength}
                  </AssessmentRow>
                ))}
              </AssessmentList>
            ) : (
              <p className="text-xs text-[var(--color-text-subtle)]">
                {t("applicants.analysis.none_identified")}
              </p>
            )}
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader>
            <PanelTitle>{t("applicants.analysis.gaps")}</PanelTitle>
          </PanelHeader>
          <PanelBody>
            {localizedGaps.length > 0 ? (
              <AssessmentList>
                {localizedGaps.map((gap, index) => (
                  <AssessmentRow key={index} kind="gap">
                    {gap}
                  </AssessmentRow>
                ))}
              </AssessmentList>
            ) : (
              <p className="text-xs text-[var(--color-text-subtle)]">
                {t("applicants.analysis.none_identified")}
              </p>
            )}
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>{t("applicants.requirements.heading")}</PanelTitle>
        </PanelHeader>
        <PanelBody>
          {requirementRows.length > 0 ? (
            <AssessmentList>
              {requirementRows.map((row) => (
                <AssessmentRow
                  key={row.id}
                  kind={row.met ? "requirement-met" : "requirement-unmet"}
                >
                  <span className="font-medium">{row.label}</span>
                  <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                    {t("applicants.requirements.required_label")}: {row.requiredText}.{" "}
                    {t("applicants.requirements.candidate_answer")}: {row.answerText}
                  </span>
                </AssessmentRow>
              ))}
            </AssessmentList>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("applicants.requirements.met_caption")}
            </p>
          )}
        </PanelBody>
      </Panel>

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
