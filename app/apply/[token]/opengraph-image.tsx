import { ImageResponse } from "next/og";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";

export const alt = "TezHR job posting";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export const revalidate = 3600;

// Fixed light palette mirrored by components/hr/design/share-preview.tsx so the
// in-app unfurl preview matches this server-rendered PNG. Aligned to the unified
// TezHR identity: warm canvas, near-black ink, Tez Lapis primary accent.
const COLOR_BONE = "#f6f3ec";
const COLOR_INK = "#171a1f";
const COLOR_INK_3 = "#4f5963";
const COLOR_INK_4 = "#65707a";
const COLOR_INK_5 = "#8a929a";
const COLOR_RULE = "#d7d1c5";
const COLOR_RULE_2 = "#c7c1b4";
const COLOR_LAPIS = "#0b57a3";

async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family,
    )}:wght@${weight}&text=${encodeURIComponent(text)}&display=swap`;
    const css = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    }).then((r) => r.text());
    const match = css.match(/src:\s*url\((https:[^)]+)\)\s*format\(['"]?(woff2?|truetype)['"]?\)/);
    if (!match) return null;
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

function pickOgLocale(companyDefault: string | null | undefined): Locale {
  if (companyDefault === "ru" || companyDefault === "uz" || companyDefault === "en") {
    return companyDefault;
  }
  return "ru";
}

function fitTitle(title: string): { fontSize: number; lineHeight: number } {
  const len = title.length;
  if (len <= 28) return { fontSize: 88, lineHeight: 1.05 };
  if (len <= 44) return { fontSize: 72, lineHeight: 1.08 };
  if (len <= 64) return { fontSize: 60, lineHeight: 1.12 };
  if (len <= 90) return { fontSize: 50, lineHeight: 1.15 };
  return { fontSize: 42, lineHeight: 1.18 };
}

interface OgData {
  title: string;
  company: string;
  logoUrl: string | null;
  appliedCount: number;
  locales: string[];
  ogLocale: Locale;
}

async function loadOgData(token: string): Promise<OgData | null> {
  const supabase = createAdminClient();
  const { data: posting } = await supabase
    .from("job_postings")
    .select(
      "id, title, title_ru, title_uz, title_en, status, company_id, companies(id, name, logo_url, status, default_locale)",
    )
    .eq("public_token", token)
    .maybeSingle();

  if (!posting) return null;
  const company = posting.companies as unknown as
    | { id: string; name: string; logo_url: string | null; status: string; default_locale: string }
    | null
    | undefined;
  if (!company) return null;

  const ogLocale = pickOgLocale(company.default_locale);
  const title = pickLocalized(
    { ru: posting.title_ru, uz: posting.title_uz, en: posting.title_en },
    ogLocale,
    posting.title,
    company.default_locale,
  );

  const locales: string[] = [];
  if ((posting.title_ru ?? "").trim()) locales.push("RU");
  if ((posting.title_uz ?? "").trim()) locales.push("UZ");
  if ((posting.title_en ?? "").trim()) locales.push("EN");
  if (locales.length === 0) locales.push(ogLocale.toUpperCase());

  const { count } = await supabase
    .from("candidates")
    .select("id", { head: true, count: "exact" })
    .eq("job_posting_id", posting.id);

  return {
    title: title.trim() || posting.title,
    company: company.name,
    logoUrl: company.logo_url,
    appliedCount: count ?? 0,
    locales,
    ogLocale,
  };
}

function pluralizeApplied(count: number, locale: Locale): string {
  const key =
    locale === "ru"
      ? count === 1
        ? "apply.og.applied_pill_one"
        : "apply.og.applied_pill_other"
      : "apply.og.applied_pill_other";
  return t(key, locale, { count: String(count) });
}

export default async function OgImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await loadOgData(token);

  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: COLOR_BONE,
            color: COLOR_INK,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            fontWeight: 700,
          }}
        >
          TezHR.uz
        </div>
      ),
      { ...size },
    );
  }

  const eyebrow = t("apply.og.eyebrow", data.ogLocale);
  const appliedLabel = pluralizeApplied(data.appliedCount, data.ogLocale);
  const localesLabel = data.locales.join(" · ");
  const title = data.title;
  const titleStyle = fitTitle(title);

  const sansGlyphs = `${title}${data.company}TezHR.uz`;
  const monoGlyphs = `${eyebrow}${appliedLabel}${localesLabel}`;

  const [sans600, sans700, mono500] = await Promise.all([
    loadGoogleFont("Manrope", 600, sansGlyphs),
    loadGoogleFont("Manrope", 700, sansGlyphs),
    loadGoogleFont("JetBrains+Mono", 500, monoGlyphs),
  ]);

  const fonts: { name: string; data: ArrayBuffer; style: "normal"; weight: 400 | 500 | 600 | 700 }[] =
    [];
  if (sans600) fonts.push({ name: "Manrope", data: sans600, style: "normal", weight: 600 });
  if (sans700) fonts.push({ name: "Manrope", data: sans700, style: "normal", weight: 700 });
  if (mono500)
    fonts.push({ name: "JetBrains Mono", data: mono500, style: "normal", weight: 500 });

  const logoLetter = data.company.trim().slice(0, 1).toUpperCase() || "•";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: COLOR_BONE,
          display: "flex",
          flexDirection: "column",
          padding: 64,
          fontFamily: "Manrope",
          color: COLOR_INK,
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {data.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.logoUrl}
              alt=""
              width={52}
              height={52}
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                border: `1px solid ${COLOR_RULE}`,
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 8,
                background: COLOR_LAPIS,
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                fontWeight: 700,
              }}
            >
              {logoLetter}
            </div>
          )}
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: COLOR_INK_3,
              letterSpacing: "-0.01em",
            }}
          >
            {data.company}
          </div>
        </div>

        <div
          style={{
            marginTop: 36,
            fontFamily: "JetBrains Mono",
            fontSize: 18,
            fontWeight: 500,
            color: COLOR_INK_4,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </div>

        <div
          style={{
            marginTop: 20,
            fontSize: titleStyle.fontSize,
            fontWeight: 700,
            lineHeight: titleStyle.lineHeight,
            letterSpacing: "-0.025em",
            color: COLOR_INK,
            display: "-webkit-box",
            WebkitLineClamp: 3,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            maxWidth: 980,
          }}
        >
          {title}
        </div>

        <div style={{ flex: 1 }} />

        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {data.appliedCount > 0 && (
              <div
                style={{
                  fontFamily: "JetBrains Mono",
                  fontSize: 16,
                  fontWeight: 500,
                  color: COLOR_INK_3,
                  background: "transparent",
                  border: `1px solid ${COLOR_RULE_2}`,
                  borderRadius: 4,
                  padding: "6px 10px",
                  letterSpacing: "0.08em",
                }}
              >
                {appliedLabel}
              </div>
            )}
            <div
              style={{
                fontFamily: "JetBrains Mono",
                fontSize: 16,
                fontWeight: 500,
                color: COLOR_INK_3,
                background: "transparent",
                border: `1px solid ${COLOR_RULE_2}`,
                borderRadius: 4,
                padding: "6px 10px",
                letterSpacing: "0.12em",
              }}
            >
              {localesLabel}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 2,
              color: COLOR_INK_4,
              letterSpacing: "-0.02em",
            }}
          >
            <span style={{ fontSize: 22, fontWeight: 700, color: COLOR_INK_3 }}>
              TezHR
            </span>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: COLOR_INK_5,
                letterSpacing: "0.12em",
              }}
            >
              .uz
            </span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            left: 0,
            bottom: 0,
            width: 140,
            height: 5,
            background: COLOR_LAPIS,
          }}
        />
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=600",
      },
    },
  );
}
