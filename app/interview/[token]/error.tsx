"use client";

import { useEffect } from "react";
import { Panel, TezButton } from "@/components/hr/design";
import { logger } from "@/lib/logger";
import { useTranslation } from "@/lib/i18n/provider";

export default function InterviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  useEffect(() => {
    logger.error({ context: "interview", err: error }, "Interview page error boundary");
  }, [error]);

  return (
    <Panel>
      <div className="flex flex-col items-center gap-4 px-6 py-14 text-center">
        <h1 className="text-ink text-[22px] font-bold tracking-[-0.02em]">
          {t("errors.generic.title")}
        </h1>
        <p className="text-ink-3 max-w-sm text-[14px]">{t("errors.generic.description")}</p>
        <TezButton variant="primary" onClick={reset}>
          {t("common.retry")}
        </TezButton>
      </div>
    </Panel>
  );
}
