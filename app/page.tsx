import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { TezhrLanding } from "@/components/landing";
import { LandingJsonLd } from "@/components/landing/jsonld";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await getT();
  const title =
    locale === "en"
      ? "TezHR — AI-assisted ATS for Uzbekistan"
      : locale === "uz"
        ? "TezHR — O‘zbekiston uchun AI yordamidagi ATS"
        : "TezHR — ATS с поддержкой AI для Узбекистана";
  const description =
    locale === "en"
      ? "Collect applicants, compare CV evidence, source candidates, and manage interviews in Russian, Uzbek, and English."
      : locale === "uz"
        ? "Arizalarni yig‘ing, CV dalillarini solishtiring, nomzodlarni qidiring va suhbatlarni rus, o‘zbek va ingliz tillarida boshqaring."
        : "Собирайте отклики, сравнивайте факты из CV, ищите кандидатов и управляйте интервью на русском, узбекском и английском.";
  const origin = "https://tezhr.uz";
  return {
    title,
    description,
    alternates: {
      canonical: origin + "/",
      languages: {
        "ru-UZ": origin + "/",
        "uz-UZ": origin + "/?lang=uz",
        en: origin + "/?lang=en",
      },
    },
    openGraph: {
      title,
      description,
      url: origin + "/",
      siteName: "TezHR",
      locale: locale === "uz" ? "uz_UZ" : locale === "en" ? "en_US" : "ru_UZ",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function HomePage() {
  return (
    <div className={PUBLIC_FONT_CLASSES}>
      <LandingJsonLd />
      <TezhrLanding />
    </div>
  );
}
