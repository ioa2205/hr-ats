"use client";

import { AlertCircle } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

export default function CandidatesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<AlertCircle />}
      title={t("errors.generic.title")}
      description={t("errors.load_failed")}
      action={
        <Button onClick={reset} variant="secondary">
          {t("common.retry")}
        </Button>
      }
    />
  );
}
