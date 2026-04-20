"use client";

import { useRouter } from "next/navigation";
import { MoreHorizontal, Users, Pencil, Link2, XCircle, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Button,
  useToast,
} from "@/components/ui";
import { logger } from "@/lib/logger";
import { useTranslation } from "@/lib/i18n/provider";

interface JobActionsDropdownProps {
  jobId: string;
  token: string;
  status: "active" | "closed";
  appUrl: string;
  canWrite?: boolean;
}

export function JobActionsDropdown({
  jobId,
  token,
  status,
  appUrl,
  canWrite = true,
}: JobActionsDropdownProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();

  async function copyLink() {
    const url = `${appUrl}/apply/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ variant: "success", title: t("hr.toast.link_copied") });
    } catch {
      toast({ variant: "error", title: t("hr.toast.copy_failed") });
    }
  }

  async function toggleStatus() {
    const newStatus = status === "active" ? "closed" : "active";
    try {
      const res = await fetch(`/api/hr/jobs/${jobId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      toast({
        variant: "success",
        title: t(newStatus === "closed" ? "hr.toast.closed" : "hr.toast.reopened"),
      });
      router.refresh();
    } catch (err) {
      logger.error({ err }, "[jobs] status toggle failed");
      toast({ variant: "error", title: t("hr.toast.status_error") });
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">{t("hr.jobs.actions_label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/hr/jobs/${jobId}/applicants`)}>
          <Users className="h-4 w-4" />
          {t("hr.jobs.view_applicants")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push(`/hr/jobs/${jobId}/edit`)}
          disabled={!canWrite}
        >
          <Pencil className="h-4 w-4" />
          {t("hr.jobs.edit")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyLink}>
          <Link2 className="h-4 w-4" />
          {t("hr.jobs.copy_link")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={toggleStatus}
          disabled={!canWrite}
          title={!canWrite ? t("quota.subscription_inactive_short") : undefined}
        >
          {status === "active" ? (
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
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
