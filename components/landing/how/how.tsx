import type { ReactNode } from "react";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/types";
import { ArrowIcon } from "../icons";
import { StepMock1, StepMock2, StepMock3 } from "./step-mocks";
import { Walkthrough } from "./walkthrough";

interface Step {
  n: string;
  labelKey: TranslationKey;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  descKey: TranslationKey;
  timeKey: TranslationKey;
  mock: ReactNode;
}

export async function HowItWorks() {
  const { t } = await getT();

  const steps: Step[] = [
    {
      n: "01",
      labelKey: "landing.how.step1_label",
      titleKey: "landing.how.step1_title",
      subtitleKey: "landing.how.step1_subtitle",
      descKey: "landing.how.step1_desc",
      timeKey: "landing.how.step1_time",
      mock: <StepMock1 />,
    },
    {
      n: "02",
      labelKey: "landing.how.step2_label",
      titleKey: "landing.how.step2_title",
      subtitleKey: "landing.how.step2_subtitle",
      descKey: "landing.how.step2_desc",
      timeKey: "landing.how.step2_time",
      mock: <StepMock2 />,
    },
    {
      n: "03",
      labelKey: "landing.how.step3_label",
      titleKey: "landing.how.step3_title",
      subtitleKey: "landing.how.step3_subtitle",
      descKey: "landing.how.step3_desc",
      timeKey: "landing.how.step3_time",
      mock: <StepMock3 />,
    },
  ];

  return (
    <section
      id="how"
      className="paper-grain"
      style={{ position: "relative", padding: "100px 28px 120px", background: "var(--paper)" }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 28,
            marginBottom: 20,
            borderBottom: "1px solid var(--ink)",
            paddingBottom: 14,
          }}
        >
          <span
            className="mono"
            style={{ fontSize: 11, letterSpacing: "0.2em", color: "var(--persimmon-2)" }}
          >
            {t("landing.how.section_tag")}
          </span>
          <span
            className="serif"
            style={{ fontSize: 20, fontStyle: "italic", color: "var(--ink-3)" }}
          >
            {t("landing.how.section_title")}
          </span>
          <span
            className="mono"
            style={{
              marginLeft: "auto",
              fontSize: 11,
              letterSpacing: "0.18em",
              color: "var(--ink-3)",
            }}
          >
            {t("landing.how.section_meta")}
          </span>
        </div>

        <h2
          className="serif"
          style={{
            margin: "0 0 60px",
            fontSize: 88,
            lineHeight: 0.94,
            letterSpacing: "-0.035em",
            maxWidth: 1000,
          }}
        >
          {t("landing.how.heading")}{" "}
          <em style={{ color: "var(--persimmon-2)" }}>{t("landing.how.heading_em")}</em>{" "}
          {t("landing.how.heading_tail")}
        </h2>

        <div
          className="grid grid-cols-1 md:grid-cols-3"
          style={{
            gap: 0,
            borderTop: "2px solid var(--ink)",
            borderBottom: "2px solid var(--ink)",
          }}
        >
          {steps.map((s, i) => (
            <div
              key={s.n}
              style={{
                padding: "32px 28px",
                borderRight: i < 2 ? "1px solid var(--ink)" : "0",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div
                style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}
              >
                <span
                  className="serif"
                  style={{
                    fontSize: 88,
                    lineHeight: 0.9,
                    letterSpacing: "-0.04em",
                    color: "var(--persimmon-2)",
                  }}
                >
                  {s.n}
                </span>
                <div style={{ textAlign: "right" }}>
                  <div
                    className="mono"
                    style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--ink-3)" }}
                  >
                    {t(s.labelKey)}
                  </div>
                  <div className="mono" style={{ fontSize: 14, color: "var(--ink)", marginTop: 2 }}>
                    ⏱ {t(s.timeKey)}
                  </div>
                </div>
              </div>

              <h3
                className="serif"
                style={{ margin: 0, fontSize: 28, lineHeight: 1.05, letterSpacing: "-0.02em" }}
              >
                {t(s.titleKey)}
              </h3>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: "var(--ink-4)",
                  textTransform: "uppercase",
                }}
              >
                {t(s.subtitleKey)}
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  lineHeight: 1.55,
                  color: "var(--ink-2)",
                  maxWidth: 280,
                }}
              >
                {t(s.descKey)}
              </p>

              <div style={{ marginTop: "auto", paddingTop: 16 }}>{s.mock}</div>

              {i < 2 && (
                <div
                  className="hidden md:grid"
                  style={{
                    position: "absolute",
                    right: -16,
                    top: "50%",
                    transform: "translateY(-50%)",
                    zIndex: 2,
                    width: 32,
                    height: 32,
                    background: "var(--paper)",
                    border: "1.5px solid var(--ink)",
                    borderRadius: "50%",
                    placeItems: "center",
                  }}
                >
                  <ArrowIcon size={14} color="var(--ink)" />
                </div>
              )}
            </div>
          ))}
        </div>

        <Walkthrough />
      </div>
    </section>
  );
}
