import { getT } from "@/lib/i18n/server";

interface FaqItem {
  q: string;
  a: string;
}

export async function LandingJsonLd() {
  const { locale, t } = await getT();
  const origin = "https://tezhr.uz";
  const url = origin + (locale === "ru" ? "/" : `/?lang=${locale}`);

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "TezHR",
    url: origin,
    logo: `${origin}/favicon.ico`,
    description: t("landing.hero.subhead_plain"),
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
    description: t("landing.hero.subhead_plain"),
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "UZS",
      description: t("landing.pricing.trial_tagline"),
    },
  };

  const faqItems: FaqItem[] = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
    q: t(`landing.pricing.faq_q_${i}` as "landing.pricing.faq_q_1"),
    a: t(`landing.pricing.faq_a_${i}` as "landing.pricing.faq_a_1"),
  }));

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
    </>
  );
}
