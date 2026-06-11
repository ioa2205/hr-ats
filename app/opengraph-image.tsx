import { ImageResponse } from "next/og";
import { getT } from "@/lib/i18n/server";

export const alt = "TezHR — the hiring signal system";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

// Fixed light palette aligned to the Pure Signal identity (pure-white canvas,
// near-black ink, Signal Blue primary) — mirrors the design system tokens.
const COLOR_BONE = "#ffffff";
const COLOR_SURFACE = "#ffffff";
const COLOR_INK = "#0a0a0a";
const COLOR_INK_3 = "#5b6470";
const COLOR_INK_4 = "#5f6a76";
const COLOR_RULE = "#e3e6ea";
const COLOR_STRONG = "#e9edf1";
const COLOR_LINE_STRONG = "#8a939e";
const COLOR_LAPIS = "#0a66c2";
const COLOR_LAPIS_TINT = "#dcebfa";

async function loadGoogleFont(family: string, weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}&display=swap`;
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

export default async function Image() {
  const { t } = await getT();
  const eyebrow = t("landing.hero.product_label");
  const hl1 = t("landing.hero.hl_1");
  const hl2 = t("landing.hero.hl_2");
  const hlPrefix = t("landing.hero.hl_3_prefix");
  const hlNum = t("landing.hero.headline_time_num");
  const hlUnit = t("landing.hero.hl_3_unit");
  const tagline = t("landing.hero.subhead_plain");

  const sansGlyphs = `${hl1}${hl2}${hlPrefix}${hlNum}${hlUnit}${tagline}TezHR.uz`;
  const monoGlyphs = `${eyebrow}tezhr.uz0123456789`;

  const [sans600, sans800, mono500] = await Promise.all([
    loadGoogleFont("Manrope", 600, sansGlyphs),
    loadGoogleFont("Manrope", 800, sansGlyphs),
    loadGoogleFont("JetBrains+Mono", 500, monoGlyphs),
  ]);

  const fonts: Array<{ name: string; data: ArrayBuffer; weight: 500 | 600 | 800; style: "normal" }> = [];
  if (mono500) fonts.push({ name: "JetBrains Mono", data: mono500, weight: 500, style: "normal" });
  if (sans600) fonts.push({ name: "Manrope", data: sans600, weight: 600, style: "normal" });
  if (sans800) fonts.push({ name: "Manrope", data: sans800, weight: 800, style: "normal" });

  const bars = [94, 87, 82, 76];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: COLOR_BONE,
          padding: "60px 64px 52px",
          fontFamily: "Manrope",
          position: "relative",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "baseline" }}>
            <span style={{ fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", color: COLOR_INK }}>TezHR</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: COLOR_INK_4, letterSpacing: "0.1em", marginLeft: 4 }}>.uz</span>
          </div>
          <div
            style={{
              fontFamily: "JetBrains Mono",
              fontSize: 16,
              fontWeight: 500,
              color: COLOR_LAPIS,
              letterSpacing: "0.08em",
              border: `1px solid ${COLOR_LAPIS_TINT}`,
              background: COLOR_LAPIS_TINT,
              borderRadius: 999,
              padding: "7px 14px",
            }}
          >
            {eyebrow}
          </div>
        </div>

        {/* Headline + ranked motif */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 660 }}>
            <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.02, letterSpacing: "-0.035em", color: COLOR_INK, display: "flex", flexWrap: "wrap" }}>
              {hl1} {hl2} {hlPrefix}
              <span style={{ color: COLOR_LAPIS }}>{hlNum}</span>
              {hlUnit}
            </div>
            <div style={{ marginTop: 22, fontSize: 24, fontWeight: 500, color: COLOR_INK_3, maxWidth: 600, lineHeight: 1.4 }}>
              {tagline}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 13,
              padding: 24,
              width: 320,
              background: COLOR_SURFACE,
              border: `1px solid ${COLOR_RULE}`,
              borderRadius: 18,
            }}
          >
            {bars.map((s, i) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 500, color: COLOR_INK_4, width: 14 }}>{i + 1}</span>
                <div style={{ flex: 1, height: 10, borderRadius: 999, background: COLOR_STRONG, display: "flex" }}>
                  <div style={{ width: `${s}%`, height: 10, borderRadius: 999, background: i === 0 ? COLOR_LAPIS : COLOR_LINE_STRONG }} />
                </div>
                <span style={{ fontFamily: "JetBrains Mono", fontSize: 14, fontWeight: 500, color: COLOR_INK, width: 26, textAlign: "right" }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: `1px solid ${COLOR_RULE}`,
            paddingTop: 22,
            fontFamily: "JetBrains Mono",
            fontSize: 16,
            color: COLOR_INK_4,
            letterSpacing: "0.1em",
          }}
        >
          <span>tezhr.uz</span>
          <span style={{ color: COLOR_LAPIS }}>RU · UZ · EN</span>
        </div>

        <div style={{ position: "absolute", left: 0, bottom: 0, width: 160, height: 6, background: COLOR_LAPIS }} />
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
