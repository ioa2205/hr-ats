"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState, Button } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

export default function SourcingResultsNotFound() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<FileQuestion />}
      title={t("hr.jobs.not_found_title")}
      description={t("errors.not_found.description")}
      action={
        <Button asChild>
          <Link href="/hr/jobs">{t("hr.jobs.back_to_list")}</Link>
        </Button>
      }
    />
  );
}
