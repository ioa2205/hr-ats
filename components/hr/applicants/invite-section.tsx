"use client";

import { useState } from "react";
import { Check, Send } from "lucide-react";
import { TezButton } from "@/components/hr/design";
import { InviteModal } from "./invite-modal";
import { relativeDate } from "@/lib/time";
import type { Candidate } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";

interface InviteSectionProps {
  candidate: Candidate;
  postingTitle: string;
  templates: Record<string, string>;
  onUpdate: (id: string, updates: Partial<Candidate>) => void;
}

export function InviteSection({
  candidate,
  postingTitle,
  templates,
  onUpdate,
}: InviteSectionProps) {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  if (candidate.status === "invited") {
    return (
      <div className="border-rule bg-bone-2/60 shrink-0 border-t px-4 py-3">
        <div className="border-rule bg-paper flex items-center gap-2.5 rounded-[5px] border px-3 py-2">
          <span className="bg-ink text-paper flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <span className="text-ink text-[13px] font-medium">
            {t("applicants.status_line.invited_prefix", {
              date: candidate.invited_at ? relativeDate(candidate.invited_at) : "",
            })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-rule bg-bone-2/60 shrink-0 border-t px-4 py-3">
      <TezButton
        variant="accent"
        size="lg"
        onClick={() => setModalOpen(true)}
        leadingIcon={<Send className="h-3.5 w-3.5" />}
        className="h-[38px] w-full justify-center text-[13px] font-semibold"
      >
        {t("applicants.invite.invite_button")}
      </TezButton>

      <InviteModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        candidate={candidate}
        postingTitle={postingTitle}
        templates={templates}
        onUpdate={onUpdate}
      />
    </div>
  );
}
