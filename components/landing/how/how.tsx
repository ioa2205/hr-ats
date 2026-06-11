import type { ReactNode } from "react";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/types";
import { SectionHeader } from "../section";
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
    <section id="how" className="relative" style={{ background: "var(--paper-2)", padding: "clamp(72px, 8vw, 104px) 24px" }}>
      <div className="mx-auto lp-reveal" style={{ maxWidth: 1200 }}>
        <SectionHeader eyebrow={t("landing.how.section_tag")} meta={t("landing.how.section_meta")} maxWidth={960}>
          {t("landing.how.heading")} <span className="lp-accent">{t("landing.how.heading_em")}</span> {t("landing.how.heading_tail")}
        </SectionHeader>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <div key={s.n} className="lp-panel flex flex-col gap-4" style={{ padding: "26px 24px" }}>
              <div className="flex items-center justify-between">
                <span
                  className="mono grid h-10 w-10 place-items-center rounded-lg text-[15px]"
                  style={{ background: "var(--ikat)", color: "var(--color-on-primary)", fontWeight: 700, letterSpacing: "-0.02em" }}
                >
                  {s.n}
                </span>
                <span className="lp-chip" style={{ fontSize: 10 }}>
                  {t(s.timeKey)}
                </span>
              </div>

              <div>
                <h3 className="lp-h3 m-0">{t(s.titleKey)}</h3>
                <div className="mono mt-1.5" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                  {t(s.subtitleKey)}
                </div>
              </div>

              <p className="m-0 text-[14.5px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
                {t(s.descKey)}
              </p>

              <div className="mt-auto pt-2">{s.mock}</div>
            </div>
          ))}
        </div>

        <Walkthrough />
      </div>
    </section>
  );
}
