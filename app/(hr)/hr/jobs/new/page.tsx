import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { JobForm } from "@/components/hr/job-form";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { canCreateJob } from "@/lib/companies/quota";
import { getLocale, t } from "@/lib/i18n";

export default async function NewJobPage() {
  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();

  const allowed = await canCreateJob(companyId);
  if (!allowed.allowed) {
    redirect(`/hr/settings/billing?reason=${allowed.reason ?? "blocked"}`);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href="/hr/jobs"
          className="mb-2 inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-1 text-[11.5px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="h-3 w-3" />
          {t("hr.nav.jobs", locale)}
        </Link>
        <h1 className="text-[clamp(1.5rem,4vw,1.85rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
          {t("hr.jobs.create", locale)}
        </h1>
        <p className="mt-1.5 max-w-[580px] text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
          {t("hr.jobs.create_sub", locale)}
        </p>
      </div>

      <JobForm mode="create" />
    </div>
  );
}
