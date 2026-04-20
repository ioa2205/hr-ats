"use client";

import { AlertCircle } from "lucide-react";
import { Panel, TezButton } from "@/components/hr/design";
import { useTranslation } from "@/lib/i18n/provider";

export default function ApplyError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Panel>
      <div className="flex flex-col items-center gap-4 px-6 py-14 text-center sm:py-20">
        <div className="bg-persimmon-tint border-persimmon/30 flex h-14 w-14 items-center justify-center rounded-full border">
          <AlertCircle className="text-persimmon-2 h-6 w-6" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-ink text-[24px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[28px]">
            {t("errors.generic.title")}
          </h1>
          <p className="text-ink-3 mx-auto max-w-sm text-[14.5px] leading-[1.6]">
            {t("errors.load_failed")}
          </p>
        </div>
        <TezButton variant="primary" onClick={reset}>
          {t("common.retry")}
        </TezButton>
      </div>
    </Panel>
  );
}
