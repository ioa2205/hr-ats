"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button, useToast } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import { logger } from "@/lib/logger";

interface FindCandidatesButtonProps {
  jobId: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "tonal";
  label?: string;
}

export function FindCandidatesButton({
  jobId,
  disabled = false,
  variant = "secondary",
  label,
}: FindCandidatesButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/jobs/${jobId}/source`, { method: "POST" });
      if (res.status === 202) {
        const { searchId } = (await res.json()) as { searchId: string };
        router.push(`/hr/jobs/${jobId}/sourcing/${searchId}`);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.status === 409) {
        toast({ variant: "info", title: t("sourcing.find.inflight") });
        router.refresh();
        return;
      }
      if (body.error === "sourcing_quota_exceeded") {
        toast({ variant: "error", title: t("sourcing.find.quota_exceeded") });
        return;
      }
      if (body.error === "subscription_inactive") {
        toast({ variant: "error", title: t("sourcing.find.inactive") });
        return;
      }
      throw new Error(body.error ?? "unknown");
    } catch (err) {
      logger.error({ err: String(err), jobId }, "[sourcing] find candidates failed");
      toast({ variant: "error", title: t("sourcing.find.error") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={variant}
      onClick={handleClick}
      loading={loading}
      disabled={disabled}
      title={disabled ? t("sourcing.find.hint") : undefined}
    >
      <Search className="h-4 w-4" />
      {label ?? t("sourcing.find.button")}
    </Button>
  );
}
