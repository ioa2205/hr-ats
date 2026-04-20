"use client";

import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { EmptyState, Button } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

export default function OperatorCompanyNotFound() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={<FileQuestion />}
      title={t("admin.company_not_found")}
      description={t("errors.not_found.description")}
      action={
        <Button asChild>
          <Link href="/operator/companies">{t("admin.companies.back")}</Link>
        </Button>
      }
    />
  );
}
