"use client";

import { useState, type ReactNode } from "react";
import { Check, Flag, FileSearch, ExternalLink, Phone, Send } from "lucide-react";
import {
  AIFitScore,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui";
import { safeHttpUrl } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { PromoteButton } from "./promote-button";

export interface RequirementResultView {
  id: string;
  label: string;
  met: boolean;
  evidence: string;
  confidence: number;
}
export interface AxisView {
  key: string;
  score: number;
  evidence: string;
}
export interface EvidenceFieldView {
  field: string;
  value: string;
  evidence: string;
}
export interface SourcedCandidateCardProps {
  sourcedId: string;
  rank: number;
  fullName: string;
  headline: string | null;
  sourceLabel: string;
  score: number;
  confidence: number;
  verified: boolean;
  promoted: boolean;
  /** true when the candidate missed one or more tolerated hard requirements. */
  nearMiss?: boolean;
  /** labels of the unmet requirements (shown on a near-miss candidate). */
  missedRequirements?: string[];
  requirements: RequirementResultView[];
  axes: AxisView[];
  gaps: string[];
  risks: string[];
  evidenceFields: EvidenceFieldView[];
  /** how to reach the candidate. hh hides phone/email until the resume is opened
   *  on hh, so profileUrl is the connect path there; telegram/internal carry a phone. */
  profileUrl: string | null;
  phone: string | null;
  telegram: string | null;
}

/** Met = success check, unmet = warning flag (advisory, never an auto-reject). */
function MetIcon({ met }: { met: boolean }) {
  return met ? (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-container)] text-[var(--color-success)]">
      <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
    </span>
  ) : (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-warning-container)] text-[var(--color-warning)]">
      <Flag className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="text-xs font-semibold tracking-[0.05em] text-[var(--color-text-muted)] uppercase">
      {children}
    </h4>
  );
}

export function SourcedCandidateCard(props: SourcedCandidateCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Re-validate at render: this card is reusable and a javascript:/data: href
  // would execute on click even with target="_blank".
  const safeProfileUrl = safeHttpUrl(props.profileUrl);
  const metCount = props.requirements.filter((r) => r.met).length;
  const hasContact = Boolean(safeProfileUrl || props.phone || props.telegram);

  return (
    <div className="border-b border-[var(--color-line)] px-4 py-4 last:border-b-0 sm:px-5">
      <div className="flex items-start gap-3 sm:gap-4">
        <div className="data-mono w-5 shrink-0 pt-0.5 text-center text-[13px] font-semibold text-[var(--color-text-subtle)]">
          {props.rank}
        </div>
        <div className="min-w-0 flex-1">
          {/* Identity + advisory fit. Single content column so long names and
              requirement evidence never get crushed by a right rail on phones. */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold text-[var(--color-text)]">
                  {props.fullName}
                </span>
                <Badge tone="neutral">{props.sourceLabel}</Badge>
                {props.verified && (
                  <Badge tone="success">
                    <Check className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
                    {t("sourcing.results.verified_badge")}
                  </Badge>
                )}
                {props.nearMiss && (
                  <Badge tone="warning">
                    <Flag className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
                    {t("sourcing.results.near_miss_badge")}
                  </Badge>
                )}
              </div>
              {props.headline && props.headline !== props.fullName && (
                <div className="mt-0.5 line-clamp-1 text-[12.5px] text-[var(--color-text-muted)]">
                  {props.headline}
                </div>
              )}
              {props.nearMiss && props.missedRequirements && props.missedRequirements.length > 0 && (
                <div className="mt-0.5 line-clamp-1 text-[11.5px] text-[var(--color-warning)]">
                  {t("sourcing.results.near_miss_missing", {
                    requirements: props.missedRequirements.join(", "),
                  })}
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <AIFitScore
                score={Math.round(props.score)}
                label={t("applicants.analysis.ai_fit_score")}
                variant="compact"
              />
              <span className="data-mono text-[10.5px] text-[var(--color-text-subtle)]">
                {t("sourcing.results.confidence_label")} {Math.round(props.confidence * 100)}%
              </span>
            </div>
          </div>

          {/* Requirement checklist — proves the guarantee inline */}
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {props.requirements.map((req) => (
              <li key={req.id} className="flex items-start gap-2">
                <MetIcon met={req.met} />
                <div className="min-w-0">
                  <span className="text-[12.5px] text-[var(--color-text)]">{req.label}</span>
                  {req.evidence && (
                    <span className="ml-1.5 text-[11.5px] text-[var(--color-text-subtle)] italic">
                      “{req.evidence}”
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Actions wrap below the content — reachable on phones, no crushed rail. */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
              <FileSearch className="h-3.5 w-3.5" />
              {t("sourcing.results.view_evidence")}
            </Button>
            {safeProfileUrl && (
              <Button asChild variant="secondary" size="sm">
                <a href={safeProfileUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                  {t("sourcing.results.open_profile")}
                </a>
              </Button>
            )}
            {/* Promote only when there's a usable phone — the candidates pool
                requires one, so this avoids a dead-end "no phone" error. */}
            {props.phone && (
              <PromoteButton sourcedId={props.sourcedId} promoted={props.promoted} />
            )}
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          aria-describedby={undefined}
          className="sm:max-w-[640px] sm:max-h-[88vh] sm:overflow-y-auto"
        >
          {/* Header — identity + advisory AI fit at a glance */}
          <div className="flex items-start gap-4 border-b border-[var(--color-line)] px-5 py-4 pr-12">
            <div className="shrink-0 pt-0.5">
              <AIFitScore
                score={Math.round(props.score)}
                label={t("applicants.analysis.ai_fit_score")}
                size={64}
              />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="truncate text-[17px] leading-tight tracking-[-0.01em]">
                {props.fullName}
              </DialogTitle>
              {props.headline && props.headline !== props.fullName && (
                <div className="mt-1 line-clamp-2 text-[12.5px] leading-snug text-[var(--color-text-muted)]">
                  {props.headline}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <Badge tone="neutral">{props.sourceLabel}</Badge>
                {props.verified && (
                  <Badge tone="success">
                    <Check className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
                    {t("sourcing.results.verified_badge")}
                  </Badge>
                )}
                {props.nearMiss && (
                  <Badge tone="warning">
                    <Flag className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden="true" />
                    {t("sourcing.results.near_miss_badge")}
                  </Badge>
                )}
                <span className="data-mono text-[10.5px] text-[var(--color-text-subtle)]">
                  {t("sourcing.results.confidence_label")} {Math.round(props.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4">
            {/* Contact — how to reach the candidate. hh exposes contacts only on
                the resume page itself, so the link is the connect path there. */}
            {hasContact && (
              <section className="mb-5">
                <SectionLabel>{t("sourcing.results.contact_label")}</SectionLabel>
                <div className="mt-2 flex flex-wrap gap-2">
                  {safeProfileUrl && (
                    <Button asChild variant="secondary" size="sm">
                      <a href={safeProfileUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("sourcing.results.open_profile")}
                      </a>
                    </Button>
                  )}
                  {props.phone && (
                    <Button asChild variant="secondary" size="sm">
                      <a href={`tel:${props.phone}`}>
                        <Phone className="h-3.5 w-3.5" />
                        {props.phone}
                      </a>
                    </Button>
                  )}
                  {props.telegram && (
                    <Button asChild variant="secondary" size="sm">
                      <a
                        href={`https://t.me/${props.telegram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {props.telegram}
                      </a>
                    </Button>
                  )}
                </div>
              </section>
            )}

            {/* Hard requirements — the core proof, with per-item evidence */}
            {props.requirements.length > 0 && (
              <section className="mb-5">
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <SectionLabel>{t("sourcing.results.requirements_title")}</SectionLabel>
                  <span className="text-[11px] text-[var(--color-text-subtle)]">
                    {t("sourcing.results.evidence_summary", {
                      met: String(metCount),
                      total: String(props.requirements.length),
                    })}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {props.requirements.map((req) => (
                    <li
                      key={req.id}
                      className="rounded-[var(--radius-md)] border border-[var(--color-line)] p-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <MetIcon met={req.met} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="text-[12.5px] font-medium text-[var(--color-text)]">
                              {req.label}
                            </span>
                            <span
                              className={`shrink-0 text-[10.5px] font-semibold ${
                                req.met
                                  ? "text-[var(--color-success)]"
                                  : "text-[var(--color-warning)]"
                              }`}
                            >
                              {req.met ? t("sourcing.results.met") : t("sourcing.results.not_met")}
                              <span className="data-mono ml-1.5 font-normal text-[var(--color-text-subtle)]">
                                {Math.round(req.confidence * 100)}%
                              </span>
                            </span>
                          </div>
                          <p className="mt-1 text-[12px] leading-[1.5] text-[var(--color-text-muted)] italic">
                            {req.evidence
                              ? `“${req.evidence}”`
                              : t("sourcing.results.evidence_none")}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Fit breakdown — each scoring axis with its cited evidence */}
            {props.axes.length > 0 && (
              <section className="mb-5">
                <SectionLabel>{t("sourcing.results.score_label")}</SectionLabel>
                <ul className="mt-2.5 flex flex-col gap-3">
                  {props.axes.map((axis) => (
                    <li key={axis.key}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[12px] text-[var(--color-text)]">
                          {t(`sourcing.results.axis.${axis.key}` as TranslationKey)}
                        </span>
                        <AIFitScore
                          score={Math.round(axis.score)}
                          label={t(`sourcing.results.axis.${axis.key}` as TranslationKey)}
                          variant="compact"
                        />
                      </div>
                      {axis.evidence && (
                        <p className="mt-1 text-[11.5px] leading-[1.5] text-[var(--color-text-subtle)] italic">
                          “{axis.evidence}”
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Gaps & risks — side by side; honest about weak spots */}
            {(props.gaps.length > 0 || props.risks.length > 0) && (
              <section className="mb-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">
                {props.gaps.length > 0 && (
                  <div>
                    <SectionLabel>{t("sourcing.results.gaps_title")}</SectionLabel>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {props.gaps.map((g, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-[12px] leading-[1.45] text-[var(--color-text-muted)]"
                        >
                          <span
                            className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[var(--color-text-subtle)]"
                            aria-hidden
                          />
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {props.risks.length > 0 && (
                  <div>
                    <SectionLabel>{t("sourcing.results.risks_title")}</SectionLabel>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {props.risks.map((r, i) => (
                        <li
                          key={i}
                          className="flex gap-2 text-[12px] leading-[1.45] text-[var(--color-text-muted)]"
                        >
                          <span
                            className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-warning)]"
                            aria-hidden
                          />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}

            {/* Source data — raw provenance fields straight from the profile */}
            {props.evidenceFields.length > 0 && (
              <section>
                <SectionLabel>{t("sourcing.results.provenance_title")}</SectionLabel>
                <ul className="mt-2 divide-y divide-[var(--color-line)] rounded-[var(--radius-md)] border border-[var(--color-line)]">
                  {props.evidenceFields.map((f, i) => (
                    <li key={i} className="flex gap-2.5 px-3 py-2 text-[11.5px]">
                      <span className="data-mono inline-block min-w-[68px] shrink-0 text-[var(--color-text-subtle)]">
                        {f.field}
                      </span>
                      <span className="leading-[1.5] text-[var(--color-text-muted)]">{f.value}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
