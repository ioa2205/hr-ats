"use client";

import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthPanel } from "@/components/auth/auth-panel";
import { useTranslation } from "@/lib/i18n/provider";

export default function OnboardingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <AuthPanel
      eyebrow={<AlertCircle className="inline h-3 w-3" aria-hidden="true" />}
      title={t("errors.generic.title")}
      subtitle={t("errors.load_failed")}
    >
      <Button size="lg" fullWidth onClick={reset}>
        {t("common.retry")}
      </Button>
    </AuthPanel>
  );
}
