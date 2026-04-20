import { notFound } from "next/navigation";
import { fetchPublicInterview } from "@/lib/interviews/public-fetch";
import { getApplyLocale } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { InterviewClient } from "@/components/candidate/interview-client";

export default async function InterviewPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await fetchPublicInterview(token);

  if (!data) {
    notFound();
  }

  const locale = await getApplyLocale(data.company.default_locale);
  const jobTitle = pickLocalized(
    {
      ru: data.job.title_ru,
      uz: data.job.title_uz,
      en: data.job.title_en,
    },
    locale,
    data.job.title,
    data.company.default_locale,
  );

  return <InterviewClient initial={data} jobTitle={jobTitle} locale={locale} />;
}
