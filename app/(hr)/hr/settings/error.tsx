"use client";

import { AlertCircle } from "lucide-react";
import { TezButton } from "@/components/hr/design";
import { useTranslation } from "@/lib/i18n/provider";

export default function SettingsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="border-rule bg-paper shadow-tez-1 flex flex-col items-center gap-3 rounded-[6px] border px-6 py-12 text-center">
      <div className="bg-bone-2 text-ink-4 flex h-10 w-10 items-center justify-center rounded-full">
        <AlertCircle className="h-5 w-5" />
      </div>
      <div className="text-ink text-[14px] font-semibold">
        {t("errors.generic.title")}
      </div>
      <p className="text-ink-4 max-w-[360px] text-[12.5px]">
        {t("errors.load_failed")}
      </p>
      <TezButton variant="secondary" onClick={reset} className="mt-2">
        {t("common.retry")}
      </TezButton>
    </div>
  );
}
