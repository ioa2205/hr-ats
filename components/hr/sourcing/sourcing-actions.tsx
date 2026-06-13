"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleStop, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  useToast,
} from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import { logger } from "@/lib/logger";

interface SourcingActionsProps {
  jobId: string;
  searchId: string;
  /** show "Stop" only while the search is still in-flight. */
  inFlight: boolean;
}

export function SourcingActions({ jobId, searchId, inFlight }: SourcingActionsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [stopping, setStopping] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function stop() {
    setStopping(true);
    try {
      const res = await fetch(`/api/hr/jobs/${jobId}/sourcing/${searchId}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        toast({ variant: "success", title: t("sourcing.actions.stopped") });
        router.refresh();
      } else {
        toast({ variant: "error", title: t("sourcing.actions.stop_failed") });
      }
    } catch (err) {
      logger.error({ err: String(err), searchId }, "[sourcing] stop failed");
      toast({ variant: "error", title: t("sourcing.actions.stop_failed") });
    } finally {
      setStopping(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/hr/jobs/${jobId}/sourcing/${searchId}`, { method: "DELETE" });
      if (res.ok) {
        toast({ variant: "success", title: t("sourcing.actions.deleted") });
        router.push(`/hr/jobs/${jobId}/sourcing`);
      } else {
        toast({ variant: "error", title: t("sourcing.actions.delete_failed") });
        setDeleting(false);
      }
    } catch (err) {
      logger.error({ err: String(err), searchId }, "[sourcing] delete failed");
      toast({ variant: "error", title: t("sourcing.actions.delete_failed") });
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {inFlight && (
        <Button variant="secondary" onClick={stop} loading={stopping}>
          <CircleStop className="h-4 w-4" />
          {t("sourcing.actions.stop")}
        </Button>
      )}
      <Button variant="ghost" onClick={() => setConfirmOpen(true)} disabled={deleting}>
        <Trash2 className="h-4 w-4" />
        {t("sourcing.actions.delete")}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={(o) => !deleting && setConfirmOpen(o)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>{t("sourcing.actions.delete_confirm_title")}</DialogTitle>
            <DialogDescription>{t("sourcing.actions.delete_confirm_body")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              {t("common.cancel")}
            </Button>
            <Button variant="danger" onClick={remove} loading={deleting}>
              {t("sourcing.actions.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
