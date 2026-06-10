"use client";

import { Badge, type BadgeTone } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import type { CandidateStatus } from "@/types";

const STATUS: Record<CandidateStatus, { tone: BadgeTone; label: TranslationKey }> = {
  analyzed: { tone: "neutral", label: "applicants.status.analyzed" },
  pending_analysis: { tone: "neutral", label: "applicants.status.pending" },
  analyzing: { tone: "neutral", label: "applicants.status.analyzing" },
  analysis_failed: { tone: "neutral", label: "applicants.status.failed" },
  invited: { tone: "success", label: "applicants.status.invited" },
  rejected: { tone: "danger", label: "applicants.status.rejected" },
  rejected_screening: { tone: "neutral", label: "applicants.status.screened_out" },
  unscored: { tone: "warning", label: "applicants.status.unscored" },
};

export function CandidateStatusBadge({
  status,
  className,
}: {
  status: CandidateStatus;
  className?: string;
}) {
  const { t } = useTranslation();
  const item = STATUS[status];
  return (
    <Badge
      tone={item.tone}
      variant={status === "invited" || status === "rejected" ? "dot" : "default"}
      className={className}
    >
      {t(item.label)}
    </Badge>
  );
}

