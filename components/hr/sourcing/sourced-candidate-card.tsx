"use client";

import { useState, type ReactNode } from "react";
import { Check, X, FileSearch, ExternalLink, Phone, Send } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui";
import { ScoreMini, ScoreRing } from "@/components/hr/design";
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

function MetIcon({ met }: { met: boolean }) {
  return met ? (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
      <Check className="h-3 w-3" strokeWidth={2.5} />
    </span>
  ) : (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
      <X className="h-3 w-3" strokeWidth={2.5} />
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h4 className="text-ink-3 text-[11px] font-semibold uppercase tracking-[0.05em]">{children}</h4>
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
    <div className="border-rule border-b px-5 py-4 last:border-b-0">
      <div className="flex items-start gap-4">
        <div className="text-ink-5 w-6 shrink-0 pt-1 text-center text-[13px] font-semibold tabular-nums">
          {props.rank}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-ink text-[14px] font-semibold">{props.fullName}</span>
            <span className="border-rule bg-bone text-ink-4 rounded-[3px] border px-1.5 py-0.5 text-[10.5px]">
              {props.sourceLabel}
            </span>
            {props.verified && (
              <span className="inline-flex items-center gap-1 rounded-[3px] bg-emerald-50 px-1.5 py-0.5 text-[10.5px] text-emerald-700">
                <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                {t("sourcing.results.verified_badge")}
              </span>
            )}
          </div>
          {props.headline && props.headline !== props.fullName && (
            <div className="text-ink-4 mt-0.5 line-clamp-1 text-[12.5px]">{props.headline}</div>
          )}

          {/* Requirement checklist — proves the guarantee inline */}
          <ul className="mt-2.5 flex flex-col gap-1.5">
            {props.requirements.map((req) => (
              <li key={req.id} className="flex items-start gap-2">
                <MetIcon met={req.met} />
                <div className="min-w-0">
                  <span className="text-ink-2 text-[12.5px]">{req.label}</span>
                  {req.evidence && (
                    <span className="text-ink-5 ml-1.5 text-[11.5px] italic">
                      “{req.evidence}”
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <ScoreMini score={Math.round(props.score)} persimmon />
          <span
            className="text-ink-5 text-[10.5px]"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            {t("sourcing.results.confidence_label")} {Math.round(props.confidence * 100)}%
          </span>
          <div className="mt-1 flex flex-wrap items-center justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(true)}>
              <FileSearch className="h-3.5 w-3.5" />
              {t("sourcing.results.view_evidence")}
            </Button>
            {safeProfileUrl && (
              <a
                href={safeProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border-rule-2 bg-paper text-ink-2 hover:bg-bone inline-flex h-[34px] items-center gap-1.5 rounded-[4px] border px-3 text-[13px] font-medium"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("sourcing.results.open_profile")}
              </a>
            )}
            {/* Promote only when there's a usable phone — the candidates pool
                requires one, so this avoids a dead-end "no phone" error. */}
            {props.phone && (
              <PromoteButton sourcedId={props.sourcedId} promoted={props.promoted} />
            )}
          </div>
        </div>
      </div>

      <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="bg-ink/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 backdrop-blur-[1px]" />
          <DialogPrimitive.Content
            aria-describedby={undefined}
            className="border-rule bg-paper shadow-tez-3 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-[640px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[8px] border outline-none"
          >
            {/* Header — identity + fit at a glance */}
            <div className="border-rule flex items-start gap-4 border-b px-5 py-4">
              <div className="shrink-0 pt-0.5">
                <ScoreRing score={Math.round(props.score)} size={52} stroke={5} persimmon />
              </div>
              <div className="min-w-0 flex-1">
                <DialogPrimitive.Title className="text-ink truncate text-[17px] font-semibold leading-tight tracking-[-0.01em]">
                  {props.fullName}
                </DialogPrimitive.Title>
                {props.headline && props.headline !== props.fullName && (
                  <div className="text-ink-4 mt-1 line-clamp-2 text-[12.5px] leading-snug">
                    {props.headline}
                  </div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="border-rule bg-bone text-ink-4 rounded-[3px] border px-1.5 py-0.5 text-[10.5px]">
                    {props.sourceLabel}
                  </span>
                  {props.verified && (
                    <span className="inline-flex items-center gap-1 rounded-[3px] bg-emerald-50 px-1.5 py-0.5 text-[10.5px] text-emerald-700">
                      <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                      {t("sourcing.results.verified_badge")}
                    </span>
                  )}
                  <span
                    className="text-ink-5 text-[10.5px]"
                    style={{ fontFamily: "var(--font-tez-mono)" }}
                  >
                    {t("sourcing.results.confidence_label")} {Math.round(props.confidence * 100)}%
                  </span>
                </div>
              </div>
              <DialogPrimitive.Close
                aria-label={t("common.cancel")}
                className="text-ink-5 hover:bg-bone-2 hover:text-ink -mt-1 -mr-1 shrink-0 rounded-[4px] p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </DialogPrimitive.Close>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {/* Contact — how to reach the candidate. hh exposes contacts only on
                  the resume page itself, so the link is the connect path there. */}
              {hasContact && (
                <section className="mb-5">
                  <SectionLabel>{t("sourcing.results.contact_label")}</SectionLabel>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {safeProfileUrl && (
                      <a
                        href={safeProfileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-rule-2 bg-paper text-ink-2 hover:bg-bone inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-[12px] font-medium transition-colors"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {t("sourcing.results.open_profile")}
                      </a>
                    )}
                    {props.phone && (
                      <a
                        href={`tel:${props.phone}`}
                        className="border-rule-2 bg-paper text-ink-2 hover:bg-bone inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-[12px] transition-colors"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {props.phone}
                      </a>
                    )}
                    {props.telegram && (
                      <a
                        href={`https://t.me/${props.telegram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-rule-2 bg-paper text-ink-2 hover:bg-bone inline-flex items-center gap-1.5 rounded-[4px] border px-2.5 py-1.5 text-[12px] transition-colors"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {props.telegram}
                      </a>
                    )}
                  </div>
                </section>
              )}

              {/* Hard requirements — the core proof, with per-item evidence */}
              {props.requirements.length > 0 && (
                <section className="mb-5">
                  <div className="mb-2.5 flex items-baseline justify-between gap-3">
                    <SectionLabel>{t("sourcing.results.requirements_title")}</SectionLabel>
                    <span className="text-ink-5 text-[11px]">
                      {t("sourcing.results.evidence_summary", {
                        met: String(metCount),
                        total: String(props.requirements.length),
                      })}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {props.requirements.map((req) => (
                      <li key={req.id} className="border-rule rounded-[5px] border p-3">
                        <div className="flex items-start gap-2.5">
                          <MetIcon met={req.met} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-ink-2 text-[12.5px] font-medium">
                                {req.label}
                              </span>
                              <span
                                className={`shrink-0 text-[10.5px] font-semibold ${
                                  req.met ? "text-emerald-700" : "text-red-600"
                                }`}
                              >
                                {req.met
                                  ? t("sourcing.results.met")
                                  : t("sourcing.results.not_met")}
                                <span
                                  className="text-ink-5 ml-1.5 font-normal"
                                  style={{ fontFamily: "var(--font-tez-mono)" }}
                                >
                                  {Math.round(req.confidence * 100)}%
                                </span>
                              </span>
                            </div>
                            <p className="text-ink-4 mt-1 text-[12px] leading-[1.5] italic">
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
                          <span className="text-ink-2 text-[12px]">
                            {t(`sourcing.results.axis.${axis.key}` as TranslationKey)}
                          </span>
                          <ScoreMini score={Math.round(axis.score)} />
                        </div>
                        {axis.evidence && (
                          <p className="text-ink-5 mt-1 text-[11.5px] leading-[1.5] italic">
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
                            className="text-ink-4 flex gap-2 text-[12px] leading-[1.45]"
                          >
                            <span
                              className="bg-ink-5 mt-[7px] h-1 w-1 shrink-0 rounded-full"
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
                            className="text-ink-4 flex gap-2 text-[12px] leading-[1.45]"
                          >
                            <span
                              className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
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
                  <ul className="border-rule divide-rule mt-2 divide-y rounded-[5px] border">
                    {props.evidenceFields.map((f, i) => (
                      <li key={i} className="flex gap-2.5 px-3 py-2 text-[11.5px]">
                        <span
                          className="text-ink-5 inline-block min-w-[68px] shrink-0"
                          style={{ fontFamily: "var(--font-tez-mono)" }}
                        >
                          {f.field}
                        </span>
                        <span className="text-ink-3 leading-[1.5]">{f.value}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
