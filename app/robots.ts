import type { MetadataRoute } from "next";

const ORIGIN = "https://tezhr.uz";

export default function robots(): MetadataRoute.Robots {
  const isPreview =
    process.env.VERCEL_ENV === "preview" ||
    process.env.RAILWAY_ENVIRONMENT === "preview" ||
    process.env.NEXT_PUBLIC_ENV === "preview";
  if (isPreview) {
    return {
      rules: [{ userAgent: "*", disallow: "/" }],
    };
  }
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/hr/",
          "/operator/",
          "/onboarding/",
          "/auth/",
          "/api/",
          "/apply/",
          "/interview/",
        ],
      },
    ],
    sitemap: `${ORIGIN}/sitemap.xml`,
    host: ORIGIN,
  };
}
