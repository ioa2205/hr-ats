import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/types";
import { AIPanel } from "../mockups";

interface Feature {
  k: string;
  labelKey: TranslationKey;
  descKey: TranslationKey;
}

export async function Showcase() {
  const { t } = await getT();
  const features: Feature[] = [
    { k: "0–100", labelKey: "landing.showcase.feat_score_label", descKey: "landing.showcase.feat_score_desc" },
    { k: "RU·UZ·EN", labelKey: "landing.showcase.feat_lang_label", descKey: "landing.showcase.feat_lang_desc" },
    { k: "PDF", labelKey: "landing.showcase.feat_pdf_label", descKey: "landing.showcase.feat_pdf_desc" },
    { k: "~4s", labelKey: "landing.showcase.feat_speed_label", descKey: "landing.showcase.feat_speed_desc" },
  ];

  const hairline = "rgba(244,241,234,0.14)";
  const lightLapis = "#8fc2f5";

  return (
    <section
      id="features"
      style={{ position: "relative", padding: "clamp(80px, 9vw, 128px) 24px", background: "var(--night)", color: "var(--on-night)" }}
    >
      <div className="mx-auto lp-reveal" style={{ maxWidth: 1200 }}>
        <div className="mb-12 flex flex-wrap items-center justify-between gap-3">
          <span className="mono inline-flex items-center gap-2" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: lightLapis }}>
            <span style={{ width: 6, height: 6, borderRadius: 2, background: lightLapis }} aria-hidden />
            {t("landing.showcase.section_tag")}
          </span>
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--on-night-muted)" }}>
            {t("landing.showcase.section_meta")}
          </span>
        </div>

        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          <div className="order-2 flex justify-center lg:order-1">
            <AIPanel />
          </div>

          <div className="order-1 lg:order-2">
            <h2 className="lp-h2" style={{ margin: 0, color: "var(--on-night)" }}>
              {t("landing.showcase.heading_a")}{" "}
              <span style={{ color: lightLapis }}>{t("landing.showcase.heading_b")}</span>,{" "}
              <span style={{ color: lightLapis }}>{t("landing.showcase.heading_c")}</span> &{" "}
              <span style={{ color: lightLapis }}>{t("landing.showcase.heading_d")}</span>.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.6]" style={{ color: "var(--on-night-muted)", maxWidth: "46ch" }}>
              {t("landing.showcase.model_line", { version: "Gemini 3.1 Pro" })}
            </p>

            <div className="mt-9 grid grid-cols-2" style={{ border: `1px solid ${hairline}`, borderRadius: "var(--radius-xl)", overflow: "hidden" }}>
              {features.map((f, i) => (
                <div
                  key={f.k}
                  style={{
                    padding: "20px 22px",
                    borderRight: i % 2 === 0 ? `1px solid ${hairline}` : "0",
                    borderBottom: i < 2 ? `1px solid ${hairline}` : "0",
                  }}
                >
                  <div className="mono" style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em", color: lightLapis }}>
                    {f.k}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8, color: "var(--on-night)" }}>{t(f.labelKey)}</div>
                  <div style={{ fontSize: 12.5, color: "var(--on-night-muted)", marginTop: 4, lineHeight: 1.45 }}>{t(f.descKey)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
