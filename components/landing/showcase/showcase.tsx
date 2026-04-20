import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/types";
import { StarIcon } from "../icons";
import { AIPanel } from "../mockups";

interface Feature {
  k: string;
  labelKey: TranslationKey;
  descKey: TranslationKey;
}

export async function Showcase() {
  const { t } = await getT();
  const features: Feature[] = [
    {
      k: "0–100",
      labelKey: "landing.showcase.feat_score_label",
      descKey: "landing.showcase.feat_score_desc",
    },
    {
      k: "RU",
      labelKey: "landing.showcase.feat_lang_label",
      descKey: "landing.showcase.feat_lang_desc",
    },
    {
      k: "PDF",
      labelKey: "landing.showcase.feat_pdf_label",
      descKey: "landing.showcase.feat_pdf_desc",
    },
    {
      k: "4s",
      labelKey: "landing.showcase.feat_speed_label",
      descKey: "landing.showcase.feat_speed_desc",
    },
  ];

  return (
    <section
      id="features"
      className="night-grain"
      style={{
        position: "relative",
        padding: "120px 28px 140px",
        background: "var(--night)",
        color: "var(--paper-3)",
        overflow: "hidden",
      }}
    >
      <div className="ikat-bg" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />

      <div style={{ position: "relative", maxWidth: 1360, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 28,
            marginBottom: 20,
            borderBottom: "1px solid var(--paper-3)",
            paddingBottom: 14,
            opacity: 0.9,
          }}
        >
          <span
            className="mono"
            style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--saffron)" }}
          >
            {t("landing.showcase.section_tag")}
          </span>
          <span className="serif" style={{ fontSize: 20, fontStyle: "italic", color: "#C8C0B0" }}>
            {t("landing.showcase.section_title")}
          </span>
          <span
            className="mono"
            style={{
              marginLeft: "auto",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "#C8C0B0",
            }}
          >
            {t("landing.showcase.section_meta")}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.1fr 1fr",
            gap: 56,
            alignItems: "center",
          }}
        >
          <div style={{ transform: "rotate(-1.2deg)", paddingLeft: 10 }}>
            <AIPanel />
          </div>

          <div>
            <h2
              className="serif"
              style={{
                margin: 0,
                fontSize: 72,
                lineHeight: 0.95,
                letterSpacing: "-0.035em",
              }}
            >
              {t("landing.showcase.heading_a")}{" "}
              <span style={{ color: "var(--saffron)" }}>
                <em style={{ fontStyle: "italic" }}>{t("landing.showcase.heading_b")}</em>
              </span>
              ,{" "}
              <span style={{ color: "var(--persimmon)" }}>
                <em style={{ fontStyle: "italic" }}>{t("landing.showcase.heading_c")}</em>
              </span>{" "}
              &{" "}
              <span style={{ color: "#87C5CC" }}>
                <em style={{ fontStyle: "italic" }}>{t("landing.showcase.heading_d")}</em>
              </span>
              .
            </h2>
            <p
              className="serif"
              style={{
                margin: "24px 0 0",
                fontSize: 17,
                fontStyle: "italic",
                color: "#C8C0B0",
                lineHeight: 1.5,
                maxWidth: 440,
              }}
            >
              {t("landing.showcase.subhead")}{" "}
              <span
                style={{
                  color: "var(--paper-3)",
                  background: "var(--ikat-2)",
                  padding: "1px 6px",
                  fontSize: 16,
                }}
              >
                180 000
              </span>{" "}
              {t("landing.showcase.subhead_tail")}
            </p>

            <div
              style={{
                marginTop: 40,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 0,
                border: "1px solid rgba(247,242,230,0.2)",
              }}
            >
              {features.map((f, i) => (
                <div
                  key={f.k}
                  style={{
                    padding: "18px 20px",
                    borderRight: i % 2 === 0 ? "1px solid rgba(247,242,230,0.2)" : "0",
                    borderBottom: i < 2 ? "1px solid rgba(247,242,230,0.2)" : "0",
                  }}
                >
                  <div
                    className="serif"
                    style={{
                      fontSize: 44,
                      lineHeight: 0.9,
                      color: "var(--persimmon)",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {f.k}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>{t(f.labelKey)}</div>
                  <div style={{ fontSize: 12, color: "#C8C0B0", marginTop: 4, lineHeight: 1.4 }}>
                    {t(f.descKey)}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                marginTop: 24,
                fontSize: 13,
                color: "#C8C0B0",
                fontStyle: "italic",
                fontFamily: "var(--font-instrument-serif),serif",
              }}
            >
              <StarIcon size={12} color="var(--saffron)" />{" "}
              {t("landing.showcase.model_line", { version: "tz-rec-2.4" })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
