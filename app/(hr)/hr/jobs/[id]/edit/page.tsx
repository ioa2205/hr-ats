export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { JobForm } from "@/components/hr/job-form";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import type { HardRequirement } from "@/types";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const supabaseAdmin = createAdminClient();

  const { data: job } = await supabaseAdmin
    .from("job_postings")
    .select(
      "id,title,title_ru,title_uz,title_en,description,description_ru,description_uz,description_en,required_skills,hard_requirements",
    )
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!job) notFound();

  const shownTitle = pickLocalized(
    { ru: job.title_ru, uz: job.title_uz, en: job.title_en },
    locale,
    job.title,
  );

  return (
    <div>
      <div className="text-ink-5 mb-2 flex items-center gap-1.5 text-[11px] font-medium">
        <Link
          href={`/hr/jobs/${id}`}
          className="text-ink-4 hover:bg-bone-2 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 text-[11.5px]"
        >
          <ChevronLeft className="h-3 w-3" />
          {shownTitle}
        </Link>
      </div>

      <h1 className="text-ink mb-6 text-[28px] font-semibold leading-[1.1] tracking-[-0.018em]">
        {t("hr.jobs.edit_title", locale)}.
      </h1>

      <JobForm
        mode="edit"
        jobId={job.id}
        defaultValues={{
          title_ru: job.title_ru ?? "",
          title_uz: job.title_uz ?? "",
          title_en: job.title_en ?? "",
          description_ru: job.description_ru ?? "",
          description_uz: job.description_uz ?? "",
          description_en: job.description_en ?? "",
          required_skills: job.required_skills,
          hard_requirements: (job.hard_requirements as HardRequirement[]) ?? [],
        }}
      />
    </div>
  );
}
