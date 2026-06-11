"use client";

import { Button, Card, ErrorState } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

export default function ApplyError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <ErrorState
        title={t("errors.generic.title")}
        description={t("errors.load_failed")}
        action={
          <Button variant="primary" onClick={reset}>
            {t("common.retry")}
          </Button>
        }
      />
    </Card>
  );
}
