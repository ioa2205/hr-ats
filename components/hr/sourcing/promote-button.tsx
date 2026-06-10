"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Check } from "lucide-react";
import { Badge, Button, useToast } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import { logger } from "@/lib/logger";

export function PromoteButton({
  sourcedId,
  promoted: initialPromoted,
}: {
  sourcedId: string;
  promoted: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [promoted, setPromoted] = useState(initialPromoted);

  async function handleClick() {
    setLoading(true);
    try {
      const res = await fetch(`/api/hr/sourced-candidates/${sourcedId}/promote`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (res.ok) {
        setPromoted(true);
        toast({ variant: "success", title: t("sourcing.results.promoted") });
        router.refresh();
        return;
      }
      if (body.error === "no_phone") {
        toast({ variant: "error", title: t("sourcing.results.promote_no_phone") });
        return;
      }
      throw new Error(body.error ?? "unknown");
    } catch (err) {
      logger.error({ err: String(err), sourcedId }, "[sourcing] promote failed");
      toast({ variant: "error", title: t("sourcing.results.promote_error") });
    } finally {
      setLoading(false);
    }
  }

  if (promoted) {
    return (
      <Badge tone="success">
        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
        {t("sourcing.results.promoted")}
      </Badge>
    );
  }

  return (
    <Button variant="secondary" onClick={handleClick} loading={loading}>
      <UserPlus className="h-4 w-4" />
      {t("sourcing.results.promote")}
    </Button>
  );
}
