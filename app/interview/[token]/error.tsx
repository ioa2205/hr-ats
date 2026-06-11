"use client";

import { useEffect } from "react";
import { Button, Card, ErrorState } from "@/components/ui";
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
    <Card>
      <ErrorState
        title={t("errors.generic.title")}
        description={t("errors.generic.description")}
        action={
          <Button variant="primary" onClick={reset}>
            {t("common.retry")}
          </Button>
        }
      />
    </Card>
  );
}
