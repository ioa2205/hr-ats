import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { getApplyLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import type { HardRequirement } from "@/types";
import { markdownToPlainText } from "@/lib/markdown/to-plain-text";
import { ClosedState } from "@/components/candidate/closed-state";
import { ApplyForm } from "@/components/candidate/apply-form";

const OG_LOCALE_TAGS: Record<Locale, string> = {
  ru: "ru_RU",
  uz: "uz_UZ",
  en: "en_US",
};

function pickOgLocale(companyDefault: string | null | undefined): Locale {
  if (companyDefault === "ru" || companyDefault === "uz" || companyDefault === "en") {
    return companyDefault;
  }
  return "ru";
}

interface PostingMetaRow {
  title: string;
  title_ru: string | null;
  title_uz: string | null;
  title_en: string | null;
  description: string | null;
  description_ru: string | null;
  description_uz: string | null;
  description_en: string | null;
  status: string;
  created_at: string;
  public_token: string;
  companies: {
    name: string;
    logo_url: string | null;
    status: string;
    default_locale: string;
    website_url?: string | null;
  } | null;
}

function isoDaysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

async function fetchPostingForMeta(token: string): Promise<PostingMetaRow | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("job_postings")
    .select(
      "title, title_ru, title_uz, title_en, description, description_ru, description_uz, description_en, status, created_at, public_token, companies(name, logo_url, status, default_locale)",
    )
    .eq("public_token", token)
    .maybeSingle();
  return (data as unknown as PostingMetaRow | null) ?? null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const posting = await fetchPostingForMeta(token);
  if (!posting || !posting.companies || posting.status === "closed") {
    return { title: "TezHR" };
  }
  const company = posting.companies;
  const ogLocale = pickOgLocale(company.default_locale);

  const title = pickLocalized(
    { ru: posting.title_ru, uz: posting.title_uz, en: posting.title_en },
    ogLocale,
    posting.title,
    company.default_locale,
  );
  const rawDescription = pickLocalized(
    { ru: posting.description_ru, uz: posting.description_uz, en: posting.description_en },
    ogLocale,
    posting.description ?? "",
    company.default_locale,
  );
  const description = markdownToPlainText(rawDescription, 160);

  const url = `${env.APP_URL}/apply/${posting.public_token}`;
  const fullTitle = `${title} — ${company.name} · TezHR`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      type: "website",
      url,
      siteName: "TezHR",
      locale: OG_LOCALE_TAGS[ogLocale],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
    },
    robots: { index: true, follow: true },
  };
}

const APPLY_KEYS: TranslationKey[] = [
  "apply.title",
  "apply.eyebrow_position",
  "apply.intro_subtitle",
  "apply.description_heading",
  "apply.requirements_heading",
  "apply.personal_heading",
  "apply.step_progress",
  "apply.step_requirements",
  "apply.step_details",
  "apply.continue",
  "apply.yes",
  "apply.no",
  "apply.full_name",
  "apply.phone_number",
  "apply.phone_hint",
  "apply.upload_cv",
  "apply.upload_hint",
  "apply.security_label",
  "apply.security_hint",
  "apply.submit",
  "apply.sending",
  "apply.success_heading",
  "apply.success_body",
  "apply.requirement_failed",
  "apply.validation_failed",
  "apply.cv.error_type",
  "apply.cv.error_size",
  "apply.cv.remove_label",
  "apply.too_many",
  "apply.bot_detected",
  "apply.error_generic",
  "apply.error_retry_hint",
  "apply.min_value_short",
  "apply.field_required",
  "apply.footer_note",
  "apply.time_estimate",
  "apply.privacy_note",
  "apply.next_step_label",
  "apply.next_step_body",
  "apply.powered_by",
  "apply.secured_by",
];

export default async function ApplyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const supabase = createAdminClient();
  const { data: posting } = await supabase
    .from("job_postings")
    .select(
      "id, title, title_ru, title_uz, title_en, description, description_ru, description_uz, description_en, public_token, hard_requirements, status, company_id, created_at, companies(id, name, logo_url, status, default_locale)",
    )
    .eq("public_token", token)
    .single();

  const company = posting?.companies as
    | { id: string; name: string; logo_url: string | null; status: string; default_locale: string }
    | null
    | undefined;

  const locale = await getApplyLocale(company?.default_locale);

  if (!posting || posting.status === "closed" || company?.status !== "active") {
    return <ClosedState locale={locale} />;
  }

  const translations: Record<string, string> = {};
  for (const key of APPLY_KEYS) {
    translations[key] = t(key, locale);
  }

  const hardRequirements = (posting.hard_requirements ?? []) as HardRequirement[];

  const shownTitle = pickLocalized(
    { ru: posting.title_ru, uz: posting.title_uz, en: posting.title_en },
    locale,
    posting.title,
    company.default_locale,
  );

  const shownDescription = pickLocalized(
    { ru: posting.description_ru, uz: posting.description_uz, en: posting.description_en },
    locale,
    posting.description ?? "",
    company.default_locale,
  );

  const canonical = `${env.APP_URL}/apply/${posting.public_token}`;
  const ogLocale = pickOgLocale(company.default_locale);
  const seoTitle = pickLocalized(
    { ru: posting.title_ru, uz: posting.title_uz, en: posting.title_en },
    ogLocale,
    posting.title,
    company.default_locale,
  );
  const seoDescriptionMarkdown = pickLocalized(
    { ru: posting.description_ru, uz: posting.description_uz, en: posting.description_en },
    ogLocale,
    posting.description ?? "",
    company.default_locale,
  );
  const seoDescription = markdownToPlainText(seoDescriptionMarkdown, 4000);

  const validThrough = isoDaysFromNow(90);

  const jobPostingLd = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: seoTitle,
    description: seoDescription,
    datePosted: new Date(posting.created_at).toISOString(),
    validThrough,
    employmentType: "FULL_TIME",
    directApply: true,
    url: canonical,
    hiringOrganization: {
      "@type": "Organization",
      name: company.name,
      ...(company.logo_url ? { logo: company.logo_url } : {}),
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressCountry: "UZ",
        addressLocality: "Tashkent",
      },
    },
    applicantLocationRequirements: {
      "@type": "Country",
      name: "UZ",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingLd) }}
      />
      <ApplyForm
        posting={{
          id: posting.id,
          title: shownTitle,
          description: shownDescription,
          public_token: posting.public_token,
          hard_requirements: hardRequirements,
        }}
        company={{
          name: company.name,
          logo_url: company.logo_url,
        }}
        locale={locale}
        translations={translations}
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
      />
    </>
  );
}
