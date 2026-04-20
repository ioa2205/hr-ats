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

  const [serif, mono, sans] = await Promise.all([
    loadGoogleFont("Instrument Serif", 400, allText),
    loadGoogleFont("JetBrains Mono", 500, allText),
    loadGoogleFont("Manrope", 600, allText),
  ]);

  const fonts: Array<{
    name: string;
    data: ArrayBuffer;
    weight: 400 | 500 | 600;
    style: "normal";
  }> = [];
  if (serif) fonts.push({ name: "Instrument Serif", data: serif, weight: 400, style: "normal" });
  if (mono) fonts.push({ name: "JetBrains Mono", data: mono, weight: 500, style: "normal" });
  if (sans) fonts.push({ name: "Manrope", data: sans, weight: 600, style: "normal" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#efe8db",
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
            color: "#302b25",
            borderBottom: "2px solid #141210",
            paddingBottom: 20,
          }}
        >
          <span>TEZHR · TASHKENT</span>
          <span>HR / РЕКРУТИНГ / ИИ</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontFamily: "Instrument Serif, serif",
              fontSize: 132,
              lineHeight: 0.88,
              letterSpacing: "-0.045em",
              color: "#141210",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span>{hl1}</span>
            <span>{hl2}</span>
            <span>
              <span style={{ color: "#5a5147" }}>{hlPrefix}</span>
              <em style={{ fontStyle: "italic", color: "#c1440e" }}>{hlNum}</em>
              <span style={{ color: "#5a5147", fontStyle: "italic" }}>{hlUnit}</span>
            </span>
          </div>
          <div
            style={{
              marginTop: 20,
              fontFamily: "Manrope, sans-serif",
              fontSize: 26,
              color: "#302b25",
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
            borderTop: "1.5px solid #141210",
            paddingTop: 20,
            fontFamily: "JetBrains Mono, monospace",
            fontSize: 18,
            color: "#302b25",
            letterSpacing: "0.12em",
          }}
        >
          <span>tezhr.uz</span>
          <span style={{ color: "#c1440e" }}>{cta} →</span>
        </div>
      </div>
    ),
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
