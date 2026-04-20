"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle, RotateCcw } from "lucide-react";
import {
  Button,
  useToast,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui";
import { logger } from "@/lib/logger";
import { useTranslation } from "@/lib/i18n/provider";

interface StatusToggleButtonProps {
  jobId: string;
  status: "active" | "closed";
  canWrite?: boolean;
}

export function StatusToggleButton({ jobId, status, canWrite = true }: StatusToggleButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isActive = status === "active";
  const newStatus = isActive ? "closed" : "active";

  async function handleConfirm() {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");

      toast({
        variant: "success",
        title: t(isActive ? "hr.toast.closed" : "hr.toast.reopened"),
      });
      setOpen(false);
      router.refresh();
    } catch (err) {
      logger.error({ err }, "[job-detail] status toggle failed");
      toast({ variant: "error", title: t("hr.toast.status_error") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant={isActive ? "secondary" : "tonal"}
        onClick={() => setOpen(true)}
        disabled={!canWrite}
        title={!canWrite ? t("quota.subscription_inactive_short") : undefined}
      >
        {isActive ? (
          <>
            <XCircle className="h-4 w-4" />
            {t("hr.job.close_button")}
          </>
        ) : (
          <>
            <RotateCcw className="h-4 w-4" />
            {t("hr.job.reopen_button")}
          </>
        )}
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t(isActive ? "hr.job.close_title" : "hr.job.reopen_title")}</DialogTitle>
          <DialogDescription>
            {t(isActive ? "hr.job.close_body" : "hr.job.reopen_body")}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">{t("common.cancel")}</Button>
          </DialogClose>
          <Button
            variant={isActive ? "danger" : "primary"}
            loading={loading}
            onClick={handleConfirm}
          >
            {t(isActive ? "hr.job.close_button" : "hr.job.reopen_button")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
