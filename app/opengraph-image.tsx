import { ImageResponse } from "next/og";
import { getT } from "@/lib/i18n/server";

export const alt = "TezHR — find the signal in every CV";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const COPY = {
  en: {
    kicker: "AI-assisted ATS · built in Tashkent",
    line1: "Find the signal",
    line2: "in every CV.",
    body: "Structured evidence for hiring in Russian, Uzbek, and English.",
    preview: "Product preview · demo data",
    role: "Product manager",
  },
  ru: {
    kicker: "ATS с AI · сделано в Ташкенте",
    line1: "Найдите главное",
    line2: "в каждом резюме.",
    body: "Структурированные факты для найма на русском, узбекском и английском.",
    preview: "Превью продукта · демоданные",
    role: "Продакт-менеджер",
  },
  uz: {
    kicker: "AI yordamidagi ATS · Toshkentda yaratilgan",
    line1: "Har bir CVdagi",
    line2: "asosiy signalni toping.",
    body: "Rus, o‘zbek va ingliz tillarida yollash uchun tartibli dalillar.",
    preview: "Mahsulot namoyishi · demo ma’lumot",
    role: "Mahsulot menejeri",
  },
} as const;

export default async function Image() {
  const { locale } = await getT();
  const c = COPY[locale];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        overflow: "hidden",
        position: "relative",
        padding: "48px 56px 44px",
        color: "#171a18",
        background: "#c8dce4",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: "-0.04em",
          }}
        >
          TezHR
        </span>
        <span
          style={{
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          RU · UZ · EN
        </span>
      </div>

      <div
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 50 }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: 650 }}>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.13em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            {c.kicker}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontFamily: "Georgia, serif",
              fontSize: 74,
              lineHeight: 0.98,
              letterSpacing: "-0.055em",
            }}
          >
            <span>{c.line1}</span>
            <span>{c.line2}</span>
          </div>
          <div
            style={{ display: "flex", marginTop: 24, width: 570, fontSize: 23, lineHeight: 1.4 }}
          >
            {c.body}
          </div>
        </div>

        <div style={{ display: "flex", position: "relative", width: 355, height: 298 }}>
          <div
            style={{
              position: "absolute",
              left: 6,
              top: 30,
              width: 300,
              height: 235,
              background: "#f4cf52",
              border: "2px solid #171a18",
              transform: "rotate(-5deg)",
            }}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              bottom: 4,
              width: 315,
              height: 248,
              display: "flex",
              flexDirection: "column",
              padding: "24px",
              background: "#f6f0e5",
              border: "2px solid #171a18",
              transform: "rotate(2deg)",
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {c.preview}
            </span>
            <div style={{ display: "flex", alignItems: "center", marginTop: 22 }}>
              <span
                style={{
                  width: 48,
                  height: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 48,
                  background: "#bad0b9",
                  border: "2px solid #171a18",
                  fontWeight: 800,
                }}
              >
                DR
              </span>
              <div style={{ display: "flex", flexDirection: "column", marginLeft: 14 }}>
                <strong style={{ fontSize: 24 }}>Diyora R.</strong>
                <span style={{ fontSize: 16 }}>{c.role}</span>
              </div>
              <strong style={{ marginLeft: "auto", fontFamily: "Georgia, serif", fontSize: 52 }}>
                94
              </strong>
            </div>
            {[92, 86, 90].map((value, index) => (
              <div
                key={value}
                style={{
                  height: 10,
                  display: "flex",
                  marginTop: index === 0 ? 25 : 12,
                  background: "#ded7ca",
                  border: "1px solid #171a18",
                }}
              >
                <span
                  style={{
                    display: "flex",
                    width: `${value}%`,
                    background: index === 0 ? "#e97757" : "#bad0b9",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "2px solid #171a18",
          paddingTop: 18,
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: "0.08em",
        }}
      >
        <span>tezhr.uz</span>
        <span>AI advises. You decide.</span>
      </div>
    </div>,
    size,
  );
}
