"use client";

import { ArrowLeft, ExternalLink, Phone, X } from "lucide-react";
import {
  DetailBody,
  DetailHeader,
  DetailPane,
  IconButton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";
import { cn, formatPhone } from "@/lib/utils";
import { absoluteDate } from "@/lib/time";
import { CvTab } from "./cv-tab";
import { AiAnalysisTab } from "./ai-analysis-tab";
import { NotesTab } from "./notes-tab";
import { InviteSection } from "./invite-section";
import { CandidateStatusBadge } from "./candidate-status-badge";
import type { Candidate } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";
import { relativeCandidateTime } from "@/lib/applicants/presentation";

interface CandidateDetailProps {
  candidate: Candidate;
  postingTitle: string;
  appUrl: string;
  templates: Record<string, string>;
  onClose: () => void;
  onOpenFullPage?: () => void;
  onUpdate: (id: string, updates: Partial<Candidate>) => void;
  mobile?: boolean;
  tablet?: boolean;
  fullPage?: boolean;
}

export function CandidateDetail({
  candidate,
  postingTitle,
  appUrl,
  templates,
  onClose,
  onOpenFullPage,
  onUpdate,
  mobile,
  tablet,
  fullPage,
}: CandidateDetailProps) {
  const { t } = useTranslation();
  const compact = mobile || tablet;

  return (
    <DetailPane
      className={cn(
        "h-full w-full rounded-none border-0",
        fullPage && "mx-auto max-w-[1180px] rounded-[var(--radius-lg)] border",
      )}
    >
      <DetailHeader
        className="items-start py-4"
        title={
          <div className="flex min-w-0 flex-col gap-2">
            <h2 className="truncate text-lg font-bold tracking-[-0.02em] text-[var(--color-text)]">
              {candidate.full_name}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <CandidateStatusBadge status={candidate.status} />
              <span className="text-xs font-medium text-[var(--color-text-subtle)]">
                {t("applicants.workflow_status")}
              </span>
            </div>
          </div>
        }
        subtitle={
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
            <a
              href={`tel:${candidate.phone_number}`}
              className="data-mono inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-primary)] hover:underline"
            >
              <Phone className="h-3.5 w-3.5" />
              {formatPhone(candidate.phone_number)}
            </a>
            <span
              className="text-xs text-[var(--color-text-subtle)]"
              title={absoluteDate(candidate.created_at)}
            >
              {t("applicants.applied_prefix", { date: relativeCandidateTime(candidate.created_at, t) })}
            </span>
          </div>
        }
        actions={
          <>
            {onOpenFullPage && !fullPage && !mobile && (
              <IconButton
                aria-label={t("applicants.open_full_page")}
                variant="ghost"
                size="md"
                onClick={onOpenFullPage}
              >
                <ExternalLink className="h-4 w-4" />
              </IconButton>
            )}
            <IconButton
              aria-label={compact || fullPage ? t("common.back") : t("applicants.close_detail")}
              variant="ghost"
              size="md"
              onClick={onClose}
            >
              {compact || fullPage ? <ArrowLeft className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </IconButton>
          </>
        }
      />

      <Tabs defaultValue="analysis" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="shrink-0 overflow-x-auto px-2 sm:px-4">
          <TabsTrigger value="analysis">{t("applicants.tabs.analysis")}</TabsTrigger>
          <TabsTrigger value="cv">{t("applicants.tabs.cv")}</TabsTrigger>
          <TabsTrigger value="notes">{t("applicants.tabs.notes")}</TabsTrigger>
        </TabsList>

        <DetailBody className="p-4 sm:p-5">
          <TabsContent value="analysis" className="mt-0">
            <AiAnalysisTab
              candidate={candidate}
              jobTitle={postingTitle}
              appUrl={appUrl}
              onUpdate={onUpdate}
            />
          </TabsContent>

          <TabsContent value="cv" className="mt-0">
            <CvTab candidateId={candidate.id} />
          </TabsContent>

          <TabsContent value="notes" className="mt-0">
            <NotesTab candidateId={candidate.id} initialNotes={candidate.hr_notes ?? ""} />
          </TabsContent>
        </DetailBody>
      </Tabs>

      <InviteSection
        candidate={candidate}
        postingTitle={postingTitle}
        templates={templates}
        onUpdate={onUpdate}
      />
    </DetailPane>
  );
}
