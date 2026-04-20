import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { logger } from "@/lib/logger";
import type { Locale } from "@/lib/i18n/types";

export interface LandingCustomerRow {
  id: string;
  slug: string;
  display_name: string;
  logo_url: string | null;
  industry: string | null;
  display_order: number;
}

export interface LandingCaseStudyRow {
  id: string;
  slug: string;
  headline: string;
  quote: string;
  speaker_name: string;
  speaker_role: string;
  speaker_photo_url: string | null;
  industry: string | null;
  metric_1_value: string;
  metric_1_label: string;
  metric_2_value: string | null;
  metric_2_label: string | null;
  metric_3_value: string | null;
  metric_3_label: string | null;
  featured: boolean;
}

interface RawCaseStudy {
  id: string;
  slug: string;
  industry: string | null;
  featured: boolean;
  speaker_name: string;
  speaker_role: string;
  speaker_photo_url: string | null;
  metric_1_value: string;
  metric_2_value: string | null;
  metric_3_value: string | null;
  headline_ru: string;
  headline_uz: string;
  headline_en: string;
  quote_ru: string;
  quote_uz: string;
  quote_en: string;
  metric_1_label_ru: string;
  metric_1_label_uz: string;
  metric_1_label_en: string;
  metric_2_label_ru: string | null;
  metric_2_label_uz: string | null;
  metric_2_label_en: string | null;
  metric_3_label_ru: string | null;
  metric_3_label_uz: string | null;
  metric_3_label_en: string | null;
}

async function fetchCustomers(): Promise<LandingCustomerRow[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("landing_customers")
      .select("id, slug, display_name, logo_url, industry, display_order")
      .order("display_order", { ascending: true })
      .returns<LandingCustomerRow[]>();
    if (error) {
      if (!/does not exist|relation .* not found/i.test(error.message)) {
        logger.warn(`[landing] customers fetch warning: ${error.message}`);
      }
      return [];
    }
    return data ?? [];
  } catch (err) {
    logger.warn(`[landing] customers fetch threw: ${(err as Error).message}`);
    return [];
  }
}

async function fetchCaseStudies(): Promise<RawCaseStudy[]> {
  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from("landing_case_studies")
      .select(
        "id, slug, industry, featured, speaker_name, speaker_role, speaker_photo_url, metric_1_value, metric_2_value, metric_3_value, headline_ru, headline_uz, headline_en, quote_ru, quote_uz, quote_en, metric_1_label_ru, metric_1_label_uz, metric_1_label_en, metric_2_label_ru, metric_2_label_uz, metric_2_label_en, metric_3_label_ru, metric_3_label_uz, metric_3_label_en",
      )
      .order("featured", { ascending: false })
      .order("published_at", { ascending: false })
      .returns<RawCaseStudy[]>();
    if (error) {
      if (!/does not exist|relation .* not found/i.test(error.message)) {
        logger.warn(`[landing] case studies fetch warning: ${error.message}`);
      }
      return [];
    }
    return data ?? [];
  } catch (err) {
    logger.warn(`[landing] case studies fetch threw: ${(err as Error).message}`);
    return [];
  }
}

export const getLandingCustomers = unstable_cache(fetchCustomers, ["landing-customers"], {
  revalidate: 300,
  tags: ["landing-customers"],
});

const getRawCaseStudies = unstable_cache(fetchCaseStudies, ["landing-case-studies"], {
  revalidate: 300,
  tags: ["landing-case-studies"],
});

export async function getLandingCaseStudies(locale: Locale): Promise<LandingCaseStudyRow[]> {
  const raw = await getRawCaseStudies();
  return raw.map((r) => ({
    id: r.id,
    slug: r.slug,
    headline:
      locale === "uz" ? r.headline_uz : locale === "en" ? r.headline_en : r.headline_ru,
    quote: locale === "uz" ? r.quote_uz : locale === "en" ? r.quote_en : r.quote_ru,
    speaker_name: r.speaker_name,
    speaker_role: r.speaker_role,
    speaker_photo_url: r.speaker_photo_url,
    industry: r.industry,
    featured: r.featured,
    metric_1_value: r.metric_1_value,
    metric_1_label:
      locale === "uz"
        ? r.metric_1_label_uz
        : locale === "en"
          ? r.metric_1_label_en
          : r.metric_1_label_ru,
    metric_2_value: r.metric_2_value,
    metric_2_label: r.metric_2_value
      ? locale === "uz"
        ? r.metric_2_label_uz
        : locale === "en"
          ? r.metric_2_label_en
          : r.metric_2_label_ru
      : null,
    metric_3_value: r.metric_3_value,
    metric_3_label: r.metric_3_value
      ? locale === "uz"
        ? r.metric_3_label_uz
        : locale === "en"
          ? r.metric_3_label_en
          : r.metric_3_label_ru
      : null,
  }));
}
