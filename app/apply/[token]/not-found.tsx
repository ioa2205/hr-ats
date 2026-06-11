"use client";

import { FileQuestion } from "lucide-react";
import { Card, EmptyState } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

export default function ApplyNotFound() {
  const { t } = useTranslation();
  return (
    <Card>
      <EmptyState
        icon={<FileQuestion className="h-8 w-8" strokeWidth={1.5} />}
        title={t("hr.jobs.not_found_title")}
        description={t("errors.not_found.description")}
      />
    </Card>
  );
}
