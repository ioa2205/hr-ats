import { ImageResponse } from "next/og";
import { getT } from "@/lib/i18n/server";

export const alt = "TezHR — ранжируем 200 резюме за 30 секунд";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
      family,
    )}:wght@${weight}&text=${encodeURIComponent(text)}&display=swap`;
    const css = await fetch(url).then((r) => r.text());
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
  const hl1 = t("landing.hero.hl_1");
  const hl2 = t("landing.hero.hl_2");
  const hlPrefix = t("landing.hero.hl_3_prefix");
  const hlNum = t("landing.hero.headline_time_num");
  const hlUnit = t("landing.hero.hl_3_unit");
  const tagline = t("landing.hero.subhead_plain");
  const cta = t("landing.hero.cta_primary_short");

  const allText = [hl1, hl2, hlPrefix, hlNum, hlUnit, tagline, cta, "TezHR"].join(" ");

  const [mono, sans, display] = await Promise.all([
    loadGoogleFont("JetBrains Mono", 500, allText),
    loadGoogleFont("Manrope", 600, allText),
    loadGoogleFont("Manrope", 800, allText),
  ]);

  const fonts: Array<{
    name: string;
    data: ArrayBuffer;
    weight: 500 | 600 | 800;
    style: "normal";
  }> = [];
  if (mono) fonts.push({ name: "JetBrains Mono", data: mono, weight: 500, style: "normal" });
  if (sans) fonts.push({ name: "Manrope", data: sans, weight: 600, style: "normal" });
  if (display) fonts.push({ name: "Manrope", data: display, weight: 800, style: "normal" });

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#f6f3ec",
        padding: "56px 72px 48px",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 18,
          letterSpacing: "0.2em",
          color: "#4f5963",
          borderBottom: "2px solid #171a1f",
          paddingBottom: 20,
        }}
      >
        <span>TEZHR · TASHKENT</span>
        <span>HR / РЕКРУТИНГ / ИИ</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            fontFamily: "Manrope, sans-serif",
            fontWeight: 800,
            fontSize: 132,
            lineHeight: 0.88,
            letterSpacing: "-0.045em",
            color: "#171a1f",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>{hl1}</span>
          <span>{hl2}</span>
          <span>
            <span style={{ color: "#4f5963" }}>{hlPrefix}</span>
            <em style={{ fontStyle: "normal", color: "#0b57a3" }}>{hlNum}</em>
            <span style={{ color: "#4f5963" }}>{hlUnit}</span>
          </span>
        </div>
        <div
          style={{
            marginTop: 20,
            fontFamily: "Manrope, sans-serif",
            fontSize: 26,
            color: "#4f5963",
            maxWidth: 960,
            lineHeight: 1.4,
          }}
        >
          {tagline}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1.5px solid #171a1f",
          paddingTop: 20,
          fontFamily: "JetBrains Mono, monospace",
          fontSize: 18,
          color: "#4f5963",
          letterSpacing: "0.12em",
        }}
      >
        <span>tezhr.uz</span>
        <span style={{ color: "#c1440e" }}>{cta} →</span>
      </div>
    </div>,
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
