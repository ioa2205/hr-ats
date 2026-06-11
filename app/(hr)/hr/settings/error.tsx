"use client";

import { AlertCircle } from "lucide-react";
import { Button, ErrorState } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

export default function SettingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]">
      <ErrorState
        icon={<AlertCircle />}
        title={t("errors.generic.title")}
        description={t("errors.load_failed")}
        action={
          <Button variant="secondary" onClick={reset}>
            {t("common.retry")}
          </Button>
        }
      />
    </div>
  );
}
