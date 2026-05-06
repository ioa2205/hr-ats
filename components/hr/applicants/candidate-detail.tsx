"use client";

import { ArrowLeft, X, Phone } from "lucide-react";
import { Badge, Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
import { cn, formatPhone } from "@/lib/utils";
import { relativeDate, absoluteDate } from "@/lib/time";
import { CvTab } from "./cv-tab";
import { AiAnalysisTab } from "./ai-analysis-tab";
import { NotesTab } from "./notes-tab";
import { InviteSection } from "./invite-section";
import type { Candidate } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

interface CandidateDetailProps {
  candidate: Candidate;
  postingTitle: string;
  appUrl: string;
  templates: Record<string, string>;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Candidate>) => void;
  mobile?: boolean;
}

function statusBadge(
  candidate: Candidate,
  t: (key: TranslationKey, vars?: Record<string, string>) => string,
) {
  const map: Record<
    string,
    { tone: "success" | "warning" | "danger" | "info" | "neutral"; labelKey: TranslationKey }
  > = {
    analyzed: { tone: "success", labelKey: "applicants.status.analyzed" },
    pending_analysis: { tone: "warning", labelKey: "applicants.status.pending" },
    analyzing: { tone: "warning", labelKey: "applicants.status.analyzing" },
    analysis_failed: { tone: "danger", labelKey: "applicants.status.failed" },
    invited: { tone: "info", labelKey: "applicants.status.invited" },
    rejected: { tone: "neutral", labelKey: "applicants.status.rejected" },
    rejected_screening: { tone: "neutral", labelKey: "applicants.status.screened_out" },
    unscored: { tone: "danger", labelKey: "applicants.status.unscored" },
  };
  const s = map[candidate.status];
  const label = s ? t(s.labelKey) : candidate.status;
  return (
    <Badge tone={s?.tone ?? "neutral"} variant={candidate.status === "analyzing" ? "pulse" : "dot"}>
      {label}
    </Badge>
  );
}

export function CandidateDetail({
  candidate,
  postingTitle,
  appUrl,
  templates,
  onClose,
  onUpdate,
  mobile,
}: CandidateDetailProps) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full flex-col">
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <div className="border-outline-variant flex items-start justify-between border-b p-4">
        <div className="min-w-0 space-y-1">
          {mobile && (
            <button
              onClick={onClose}
              className="text-primary mb-1 flex items-center gap-1 text-sm hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("common.back")}
            </button>
          )}
          <h2 className="text-on-surface truncate text-xl font-medium">{candidate.full_name}</h2>
          <div className="flex items-center gap-2">
            <a
              href={`tel:${candidate.phone_number}`}
              className="nums text-primary flex items-center gap-1 text-sm hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              {formatPhone(candidate.phone_number)}
            </a>
          </div>
          <div
            className="text-on-surface-variant text-xs"
            title={absoluteDate(candidate.created_at)}
          >
            {t("applicants.applied_prefix", { date: relativeDate(candidate.created_at) })}
          </div>
          <div className="pt-1">{statusBadge(candidate, t)}</div>
        </div>
        {!mobile && (
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:bg-surface-container rounded-[var(--radius-sm)] p-1"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────── */}
      <Tabs defaultValue="analysis" className="flex min-h-0 flex-1 flex-col">
        <TabsList className={cn("shrink-0 px-4")}>
          <TabsTrigger value="cv">{t("applicants.tabs.cv")}</TabsTrigger>
          <TabsTrigger value="analysis">{t("applicants.tabs.analysis")}</TabsTrigger>
          <TabsTrigger value="notes">{t("applicants.tabs.notes")}</TabsTrigger>
        </TabsList>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <TabsContent value="cv" className="px-4 pb-4">
            <CvTab candidateId={candidate.id} />
          </TabsContent>

          <TabsContent value="analysis" className="px-4 pb-4">
            <AiAnalysisTab
              candidate={candidate}
              jobTitle={postingTitle}
              appUrl={appUrl}
              onUpdate={onUpdate}
            />
          </TabsContent>

          <TabsContent value="notes" className="px-4 pb-4">
            <NotesTab candidateId={candidate.id} initialNotes={candidate.hr_notes ?? ""} />
          </TabsContent>
        </div>
      </Tabs>

      {/* ── Invite section ──────────────────────────────────────── */}
      <InviteSection
        candidate={candidate}
        postingTitle={postingTitle}
        templates={templates}
        onUpdate={onUpdate}
      />
    </div>
  );
}
