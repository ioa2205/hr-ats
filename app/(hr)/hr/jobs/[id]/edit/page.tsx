export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { JobForm } from "@/components/hr/job-form";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import type { HardRequirement, OpenQuestion, OptionalQuestion } from "@/types";

export default async function EditJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const supabaseAdmin = createAdminClient();

  const { data: job } = await supabaseAdmin
    .from("job_postings")
    .select(
      // optional_questions / open_questions are post-Docker columns absent from
      // the generated types — selected via the string and read through a cast.
      "id,title,title_ru,title_uz,title_en,description,description_ru,description_uz,description_en,required_skills,hard_requirements,optional_questions,open_questions",
    )
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!job) notFound();

  const optionalQuestions = ((job as { optional_questions?: unknown }).optional_questions ??
    []) as OptionalQuestion[];
  const openQuestions = ((job as { open_questions?: unknown }).open_questions ??
    []) as OpenQuestion[];

  const shownTitle = pickLocalized(
    { ru: job.title_ru, uz: job.title_uz, en: job.title_en },
    locale,
    job.title,
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <Link
          href={`/hr/jobs/${id}`}
          className="mb-2 inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-1 text-[11.5px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="h-3 w-3" />
          <span className="truncate">{shownTitle}</span>
        </Link>
        <h1 className="text-[clamp(1.5rem,4vw,1.85rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
          {t("hr.jobs.edit_title", locale)}
        </h1>
      </div>

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
          optional_questions: optionalQuestions,
          open_questions: openQuestions,
        }}
      />
    </div>
  );
}
