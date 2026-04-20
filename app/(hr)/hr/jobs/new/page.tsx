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
    <div>
      <div className="text-ink-5 mb-2 flex items-center gap-1.5 text-[11px] font-medium">
        <Link
          href="/hr/jobs"
          className="text-ink-4 hover:bg-bone-2 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 text-[11.5px]"
        >
          <ChevronLeft className="h-3 w-3" />
          {t("hr.nav.jobs", locale)}
        </Link>
      </div>

      <div className="mb-6">
        <h1 className="text-ink text-[28px] font-semibold leading-[1.1] tracking-[-0.018em]">
          {t("hr.jobs.create", locale)}.
        </h1>
        <p className="text-ink-4 mt-1.5 max-w-[580px] text-[13px] leading-[1.5]">
          {t("hr.jobs.create_sub", locale)}
        </p>
      </div>

      <JobForm mode="create" />
    </div>
  );
}
