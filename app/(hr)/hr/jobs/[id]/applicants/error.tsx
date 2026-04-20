"use client";

import { AlertTriangle } from "lucide-react";
import { Button, EmptyState } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

export default function ApplicantsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<AlertTriangle />}
      title={t("errors.generic.title")}
      description={t("errors.load_failed")}
      action={
        <Button variant="secondary" onClick={reset}>
          {t("common.retry")}
        </Button>
      }
    />
  );
}
