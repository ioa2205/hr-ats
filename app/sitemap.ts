import type { MetadataRoute } from "next";

const ORIGIN = "https://tezhr.uz";
const LOCALES = ["ru", "uz", "en"] as const;

type Locale = (typeof LOCALES)[number];

function withAlternates(path: string): Record<Locale, string> {
  return {
    ru: `${ORIGIN}${path}`,
    uz: `${ORIGIN}${path}?lang=uz`,
    en: `${ORIGIN}${path}?lang=en`,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    { p: "/", priority: 1.0, changeFrequency: "weekly" as const },
    { p: "/about", priority: 0.7, changeFrequency: "monthly" as const },
    { p: "/contact", priority: 0.7, changeFrequency: "monthly" as const },
    { p: "/security", priority: 0.8, changeFrequency: "monthly" as const },
    { p: "/for-candidates", priority: 0.6, changeFrequency: "monthly" as const },
    { p: "/product/multilingual", priority: 0.7, changeFrequency: "monthly" as const },
    { p: "/product/local-market", priority: 0.7, changeFrequency: "monthly" as const },
    { p: "/product/sourcing", priority: 0.7, changeFrequency: "monthly" as const },
    { p: "/terms", priority: 0.4, changeFrequency: "yearly" as const },
    { p: "/privacy", priority: 0.4, changeFrequency: "yearly" as const },
  ];

  return paths.map(({ p, priority, changeFrequency }) => ({
    url: `${ORIGIN}${p}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: { languages: withAlternates(p) },
  }));
}
