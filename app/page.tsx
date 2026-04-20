import type { Metadata } from "next";
import { PUBLIC_FONT_CLASSES } from "@/lib/public-fonts";
import { TezhrLanding } from "@/components/landing";
import { LandingJsonLd } from "@/components/landing/jsonld";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getT();
  const title =
    locale === "en"
      ? "TezHR — 200 résumés, ranked in 30 seconds"
      : locale === "uz"
        ? "TezHR — 200 ta rezyume, 30 soniyada tartiblanadi"
        : "TezHR — 200 резюме, ранжировано за 30 секунд";
  const description = t("landing.hero.subhead_plain");
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
