"use client";

import { useState } from "react";
import { Check, X, FileSearch } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui";
import { ScoreMini } from "@/components/hr/design";
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

export function SourcedCandidateCard(props: SourcedCandidateCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

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
          {props.headline && (
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
          <div className="mt-1 flex items-center gap-2">
            <Button variant="secondary" onClick={() => setOpen(true)}>
              <FileSearch className="h-3.5 w-3.5" />
              {t("sourcing.results.view_evidence")}
            </Button>
            <PromoteButton sourcedId={props.sourcedId} promoted={props.promoted} />
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{props.fullName}</DialogTitle>
            <DialogDescription>{t("sourcing.results.evidence_drawer_title")}</DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-1">
            {/* Requirements with full evidence + confidence */}
            <h4 className="text-ink-3 mb-2 text-[12px] font-semibold uppercase tracking-[0.04em]">
              {t("sourcing.results.requirements_title")}
            </h4>
            <ul className="mb-4 flex flex-col gap-2">
              {props.requirements.map((req) => (
                <li key={req.id} className="border-rule rounded-[4px] border p-2.5">
                  <div className="flex items-center gap-2">
                    <MetIcon met={req.met} />
                    <span className="text-ink-2 flex-1 text-[12.5px]">{req.label}</span>
                    <span className="text-ink-5 text-[11px]">
                      {req.met ? t("sourcing.results.met") : t("sourcing.results.not_met")} ·{" "}
                      {Math.round(req.confidence * 100)}%
                    </span>
                  </div>
                  <p className="text-ink-4 mt-1.5 text-[12px] italic">
                    {req.evidence ? `“${req.evidence}”` : t("sourcing.results.evidence_none")}
                  </p>
                </li>
              ))}
            </ul>

            {/* Score axes */}
            {props.axes.length > 0 && (
              <>
                <h4 className="text-ink-3 mb-2 text-[12px] font-semibold uppercase tracking-[0.04em]">
                  {t("sourcing.results.score_label")}
                </h4>
                <ul className="mb-4 flex flex-col gap-1.5">
                  {props.axes.map((axis) => (
                    <li key={axis.key} className="text-[12px]">
                      <div className="flex items-center justify-between">
                        <span className="text-ink-2">
                          {t(`sourcing.results.axis.${axis.key}` as TranslationKey)}
                        </span>
                        <span className="text-ink-4 tabular-nums">{Math.round(axis.score)}</span>
                      </div>
                      {axis.evidence && (
                        <p className="text-ink-5 text-[11.5px] italic">“{axis.evidence}”</p>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* Gaps & risks */}
            {props.gaps.length > 0 && (
              <div className="mb-3">
                <h4 className="text-ink-3 mb-1 text-[12px] font-semibold uppercase tracking-[0.04em]">
                  {t("sourcing.results.gaps_title")}
                </h4>
                <ul className="text-ink-4 list-disc pl-4 text-[12px]">
                  {props.gaps.map((g, i) => (
                    <li key={i}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
            {props.risks.length > 0 && (
              <div className="mb-3">
                <h4 className="text-ink-3 mb-1 text-[12px] font-semibold uppercase tracking-[0.04em]">
                  {t("sourcing.results.risks_title")}
                </h4>
                <ul className="text-ink-4 list-disc pl-4 text-[12px]">
                  {props.risks.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Raw provenance fields */}
            {props.evidenceFields.length > 0 && (
              <>
                <h4 className="text-ink-3 mb-1 text-[12px] font-semibold uppercase tracking-[0.04em]">
                  {t("sourcing.results.evidence_label")}
                </h4>
                <ul className="text-ink-4 flex flex-col gap-1 text-[11.5px]">
                  {props.evidenceFields.map((f, i) => (
                    <li key={i} className="border-rule border-b pb-1 last:border-b-0">
                      <span className="text-ink-5">[{f.field}]</span> {f.value}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
