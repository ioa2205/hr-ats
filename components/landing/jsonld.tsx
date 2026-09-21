import { getT } from "@/lib/i18n/server";

export async function LandingJsonLd() {
  const { locale } = await getT();
  const origin = "https://tezhr.uz";
  const url = origin + (locale === "ru" ? "/" : `/?lang=${locale}`);
  const description =
    locale === "en"
      ? "AI-assisted applicant tracking for teams hiring in Uzbekistan, with CV screening in Russian, Uzbek, and English."
      : locale === "uz"
        ? "O‘zbekistonda yollayotgan jamoalar uchun rus, o‘zbek va ingliz tillarida CV skriningi bilan AI yordamidagi ATS."
        : "ATS с поддержкой AI для команд в Узбекистане и скринингом CV на русском, узбекском и английском.";

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TezHR",
    url: origin,
    logo: `${origin}/favicon.ico`,
    description,
    sameAs: ["https://t.me/ibodullo"],
    address: {
      "@type": "PostalAddress",
      addressCountry: "UZ",
      addressLocality: "Tashkent",
    },
  };

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "TezHR",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: origin,
    description,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "UZS",
      description: "14-day trial with 3 active jobs and 50 CV analyses",
    },
  };

  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "TezHR",
        item: url,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(software) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  );
}
