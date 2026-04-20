"use client";

import { AlertCircle } from "lucide-react";
import { TezButton } from "@/components/hr/design";
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
      eyebrow={<AlertCircle className="inline h-3 w-3" />}
      title={t("errors.generic.title")}
      subtitle={t("errors.load_failed")}
    >
      <TezButton
        variant="primary"
        size="lg"
        onClick={reset}
        className="h-11 w-full justify-center text-[13.5px] font-semibold"
      >
        {t("common.retry")}
      </TezButton>
    </AuthPanel>
  );
}
