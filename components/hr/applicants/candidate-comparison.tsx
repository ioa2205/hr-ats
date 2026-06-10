"use client";

import { ArrowLeft, Check, Flag, Minus, Sparkles } from "lucide-react";
import {
  AIFitScore,
  AnalysisStatus,
  AssessmentList,
  AssessmentRow,
  Button,
  Panel,
} from "@/components/ui";
import { buildRequirementsTable } from "@/lib/applicants/requirements-display";
import { pickLocalized, pickLocalizedArray } from "@/lib/i18n/pick-localized";
import { useTranslation } from "@/lib/i18n/provider";
import type { Candidate, RequirementResponses, RequirementSnapshot } from "@/types";
import { CandidateStatusBadge } from "./candidate-status-badge";

function analysisStatus(candidate: Candidate) {
  if (candidate.status === "analysis_failed") return "failed" as const;
  if (candidate.status === "analyzing") return "processing" as const;
  if (candidate.status === "pending_analysis" || candidate.status === "unscored") {
    return "queued" as const;
  }
  return "complete" as const;
}

export function CandidateComparison({
  candidates,
  onBack,
  onOpen,
}: {
  candidates: Candidate[];
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const { t, locale } = useTranslation();

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </Button>
          <div>
            <h2 className="text-lg font-bold tracking-[-0.02em] text-[var(--color-text)]">
              {t("applicants.compare.title")}
            </h2>
            <p className="text-sm text-[var(--color-text-muted)]">
              {t("applicants.compare.subtitle")}
            </p>
          </div>
        </div>
        <span className="data-mono text-xs text-[var(--color-text-subtle)]">
          {candidates.length}/3
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto pb-2">
        <div
          className="grid min-w-[760px] gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.max(candidates.length, 1)}, minmax(240px, 1fr))` }}
        >
          {candidates.map((candidate) => {
            const summary = pickLocalized(
              {
                ru: candidate.one_line_summary,
                uz: candidate.one_line_summary_uz,
                en: candidate.one_line_summary_en,
              },
              locale,
              candidate.one_line_summary ?? "",
            );
            const strengths = pickLocalizedArray(
              { ru: candidate.strengths, uz: candidate.strengths_uz, en: candidate.strengths_en },
              locale,
              candidate.strengths ?? [],
            );
            const gaps = pickLocalizedArray(
              { ru: candidate.gaps, uz: candidate.gaps_uz, en: candidate.gaps_en },
              locale,
              candidate.gaps ?? [],
            );
            const requirements = buildRequirementsTable(
              candidate.requirements_snapshot as RequirementSnapshot | null,
              candidate.requirements_responses as RequirementResponses | null,
              locale,
              t,
            );

            return (
              <Panel key={candidate.id} className="flex min-w-0 flex-col">
                <div className="border-b border-[var(--color-line)] p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-[var(--color-text)]">
                        {candidate.full_name}
                      </h3>
                      <CandidateStatusBadge status={candidate.status} className="mt-1.5" />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => onOpen(candidate.id)}>
                      {t("applicants.compare.open")}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    {candidate.match_score != null ? (
                      <AIFitScore
                        score={candidate.match_score}
                        label={t("applicants.analysis.ai_fit_score")}
                        variant="compact"
                      />
                    ) : (
                      <span className="text-sm text-[var(--color-text-subtle)]">-</span>
                    )}
                    <AnalysisStatus
                      status={analysisStatus(candidate)}
                      label={t(
                        candidate.status === "analysis_failed"
                          ? "applicants.analysis.status_failed"
                          : candidate.status === "analyzing"
                            ? "applicants.analysis.status_processing"
                            : candidate.status === "pending_analysis" || candidate.status === "unscored"
                              ? "applicants.analysis.status_waiting"
                              : "applicants.analysis.status_ready",
                      )}
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-5 p-4">
                  <ComparisonSection title={t("applicants.analysis.evidence")}>
                    <p className="text-sm leading-6 text-[var(--color-text-muted)]">
                      {summary || t("applicants.analysis.no_data")}
                    </p>
                  </ComparisonSection>

                  <ComparisonSection title={t("applicants.analysis.strengths")}>
                    <AssessmentList>
                      {strengths.length ? (
                        strengths.map((item, index) => (
                          <AssessmentRow key={index} kind="strength">
                            {item}
                          </AssessmentRow>
                        ))
                      ) : (
                        <EmptyComparison icon={Minus} text={t("applicants.analysis.none_identified")} />
                      )}
                    </AssessmentList>
                  </ComparisonSection>

                  <ComparisonSection title={t("applicants.analysis.gaps")}>
                    <AssessmentList>
                      {gaps.length ? (
                        gaps.map((item, index) => (
                          <AssessmentRow key={index} kind="gap">
                            {item}
                          </AssessmentRow>
                        ))
                      ) : (
                        <EmptyComparison icon={Minus} text={t("applicants.analysis.none_identified")} />
                      )}
                    </AssessmentList>
                  </ComparisonSection>

                  <ComparisonSection title={t("applicants.requirements.heading")}>
                    <AssessmentList>
                      {requirements.length ? (
                        requirements.map((row) => (
                          <AssessmentRow
                            key={row.id}
                            kind={row.met ? "requirement-met" : "requirement-unmet"}
                          >
                            <span className="font-medium">{row.label}</span>
                            <span className="mt-0.5 block text-xs text-[var(--color-text-muted)]">
                              {row.requiredText} / {row.answerText}
                            </span>
                          </AssessmentRow>
                        ))
                      ) : (
                        <EmptyComparison icon={Check} text={t("applicants.requirements.met_caption")} />
                      )}
                    </AssessmentList>
                  </ComparisonSection>
                </div>
              </Panel>
            );
          })}
        </div>
      </div>

      <p className="flex items-center gap-2 text-xs text-[var(--color-text-subtle)]">
        <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
        {t("applicants.analysis.advisory_note")}
      </p>
    </div>
  );
}

function ComparisonSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-2 text-xs font-bold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

function EmptyComparison({
  icon: Icon,
  text,
}: {
  icon: typeof Flag;
  text: string;
}) {
  return (
    <li className="flex items-start gap-2 text-sm text-[var(--color-text-subtle)]">
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      {text}
    </li>
  );
}
