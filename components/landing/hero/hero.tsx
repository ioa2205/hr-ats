import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { ArrowIcon, HandArrowIcon, Seal } from "../icons";
import { RankingMockup } from "../mockups";
import { SIGNUP_HREF } from "../shared";
import { LandingNav } from "../shell/nav";
import { HeroDemoDialog } from "./hero-demo-dialog";
import { HeroTrustStrip } from "./hero-trust-strip";
import { Masthead } from "./masthead";
import { TickerBand } from "./ticker";

const HERO_SIGNUP_HREF = `${SIGNUP_HREF}?utm_source=landing&utm_section=hero`;

export async function Hero() {
  const { t } = await getT();

  return (
    <section
      id="main"
      className="paper-grain relative overflow-hidden"
      style={{ background: "var(--paper)" }}
    >
      <Masthead />
      <LandingNav />

      <div
        className="mx-auto"
        style={{ maxWidth: 1360, padding: "48px 28px 72px" }}
      >
        <div
          className="flex flex-wrap items-end gap-x-5 gap-y-2"
          style={{
            marginBottom: 28,
            borderBottom: "2px solid var(--ink)",
            paddingBottom: 14,
          }}
        >
          <span
            className="serif text-[clamp(20px,2vw+10px,30px)] italic leading-none"
            style={{ color: "var(--ink-3)" }}
          >
            {t("landing.hero.masthead_kicker")}
          </span>
          <span
            className="mono text-[11px] tracking-[0.2em]"
            style={{ color: "var(--ink-2)" }}
          >
            {t("landing.hero.masthead_category")}
          </span>
          <span
            className="mono ml-auto text-[11px] tracking-[0.12em]"
            style={{ color: "var(--ink-2)" }}
          >
            {t("landing.hero.masthead_cities")}
          </span>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-start lg:gap-14">
          <div className="relative">
            <h1
              className="serif text-[var(--ink)]"
              style={{
                margin: "4px 0 0",
                fontSize: "clamp(56px, 8vw + 16px, 148px)",
                lineHeight: 0.88,
                letterSpacing: "-0.045em",
                fontWeight: 400,
              }}
            >
              {t("landing.hero.hl_1")}
              <br />
              <span className="relative inline-block">
                {t("landing.hero.hl_2")}
              </span>
              <br />
              <span style={{ color: "var(--ink-3)" }}>{t("landing.hero.hl_3_prefix")}</span>
              <span className="pen-circle inline-block">
                <em
                  style={{ fontStyle: "italic", color: "var(--persimmon-2)" }}
                >
                  {t("landing.hero.headline_time_num")}
                </em>
              </span>
              <span className="serif" style={{ fontStyle: "italic", color: "var(--ink-3)" }}>
                {t("landing.hero.hl_3_unit")}
              </span>
            </h1>

            <p
              className="mt-8 max-w-[560px] text-[clamp(16px,1vw+10px,19px)] leading-[1.55]"
              style={{ color: "var(--ink-2)" }}
            >
              {t("landing.hero.subhead_plain")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href={HERO_SIGNUP_HREF} className="btn-primary">
                {t("landing.hero.cta_primary_short")}
                <ArrowIcon size={14} color="var(--paper-3)" />
              </Link>
              <HeroDemoDialog
                signupHref={HERO_SIGNUP_HREF}
                labels={{
                  triggerLabel: t("landing.hero.cta_demo_button"),
                  triggerAriaLabel: t("landing.hero.demo_trigger_aria"),
                  heading: t("landing.hero.demo_heading"),
                  body: t("landing.hero.demo_body"),
                  closeLabel: t("landing.hero.demo_close"),
                  step1Title: t("landing.hero.demo_step_1_title"),
                  step1Body: t("landing.hero.demo_step_1_body"),
                  step2Title: t("landing.hero.demo_step_2_title"),
                  step2Body: t("landing.hero.demo_step_2_body"),
                  step3Title: t("landing.hero.demo_step_3_title"),
                  step3Body: t("landing.hero.demo_step_3_body"),
                  stepsTemplate: t("landing.hero.demo_steps_of"),
                  ctaPrimary: t("landing.hero.demo_cta_primary"),
                  ctaSecondary: t("landing.hero.demo_cta_secondary"),
                }}
              />
            </div>

            <ul
              className="mono mt-7 flex flex-wrap gap-x-7 gap-y-2 p-0 text-[12px] tracking-[0.06em]"
              style={{ color: "var(--ink-3)", listStyle: "none" }}
            >
              <li>{t("landing.hero.perk_trial")}</li>
              <li>{t("landing.hero.perk_no_card")}</li>
              <li>{t("landing.hero.perk_uzbek")}</li>
            </ul>
          </div>

          <div className="relative pt-4 lg:pt-6">
            <div className="mb-3 flex items-start gap-3">
              <span
                className="mono text-[10px] tracking-[0.18em]"
                style={{ color: "var(--persimmon-2)" }}
              >
                {t("landing.hero.fig_label")}
              </span>
              <span
                className="serif flex-1 text-[13px] italic leading-[1.35]"
                style={{ color: "var(--ink-3)" }}
              >
                {t("landing.hero.fig_caption")}
              </span>
            </div>
            <div
              className="origin-top-left"
              style={{ transform: "scale(0.82)", marginLeft: -16 }}
            >
              <RankingMockup />
            </div>

            <div
              aria-hidden
              className="pointer-events-none absolute"
              style={{ right: -8, top: 170, width: 190 }}
            >
              <div className="flex items-start gap-2">
                <HandArrowIcon w={70} rotate={168} color="var(--persimmon-2)" />
                <span className="margin-note" style={{ display: "block", maxWidth: 150 }}>
                  {t("landing.hero.live_caption")}
                </span>
              </div>
            </div>

            <div className="absolute" style={{ bottom: -16, right: 24 }}>
              <Seal />
            </div>
          </div>
        </div>
      </div>

      <TickerBand />
      <HeroTrustStrip />
    </section>
  );
}
