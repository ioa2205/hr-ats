"use client";

import { useState } from "react";
import { Check, Send, UserX } from "lucide-react";
import {
  Button,
  DetailActionBar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  InlineMessage,
} from "@/components/ui";
import { InviteModal } from "./invite-modal";
import type { Candidate } from "@/types";
import { useTranslation } from "@/lib/i18n/provider";
import { relativeCandidateTime } from "@/lib/applicants/presentation";

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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectError, setRejectError] = useState(false);

  async function rejectCandidate() {
    setRejecting(true);
    setRejectError(false);
    try {
      const response = await fetch(`/api/hr/candidates/${candidate.id}/reject`, {
        method: "POST",
      });
      if (!response.ok) {
        setRejectError(true);
        return;
      }
      onUpdate(candidate.id, { status: "rejected" });
      setRejectOpen(false);
    } catch {
      setRejectError(true);
    } finally {
      setRejecting(false);
    }
  }

  return (
    <>
      <DetailActionBar className="flex-wrap">
        <div className="mr-auto min-w-0">
          <p className="text-xs font-bold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
            {t("applicants.actions.human")}
          </p>
          {candidate.status === "invited" && (
            <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-[var(--color-success)]">
              <Check className="h-3.5 w-3.5" />
              {t("applicants.status_line.invited_prefix", {
                date: candidate.invited_at ? relativeCandidateTime(candidate.invited_at, t) : "",
              })}
            </p>
          )}
        </div>
        {candidate.status !== "rejected" && candidate.status !== "rejected_screening" && (
          <Button variant="secondary" size="lg" onClick={() => setRejectOpen(true)}>
            <UserX className="h-4 w-4" />
            {t("applicants.actions.reject")}
          </Button>
        )}
        {candidate.status !== "invited" && (
          <Button size="lg" onClick={() => setInviteOpen(true)}>
            <Send className="h-4 w-4" />
            {t("applicants.invite.invite_button")}
          </Button>
        )}
      </DetailActionBar>

      <InviteModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        candidate={candidate}
        postingTitle={postingTitle}
        templates={templates}
        onUpdate={onUpdate}
      />

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("applicants.reject.title", { name: candidate.full_name })}</DialogTitle>
            <DialogDescription>{t("applicants.reject.description")}</DialogDescription>
          </DialogHeader>
          {rejectError && (
            <div className="px-6 pt-4">
              <InlineMessage tone="danger">{t("applicants.reject.error")}</InlineMessage>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)} disabled={rejecting}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={rejectCandidate} loading={rejecting}>
              <UserX className="h-4 w-4" />
              {t("applicants.actions.confirm_reject")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
