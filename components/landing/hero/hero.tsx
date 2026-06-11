import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { ArrowIcon } from "../icons";
import { RankingMockup } from "../mockups";
import { SIGNUP_HREF } from "../constants";
import { HeroDemoDialog } from "./hero-demo-dialog";
import { HeroTrustStrip } from "./hero-trust-strip";
import { PlatformPulse } from "./platform-pulse";

const HERO_SIGNUP_HREF = `${SIGNUP_HREF}?utm_source=landing&utm_section=hero`;

export async function Hero() {
  const { t } = await getT();

  return (
    <section id="main" className="signal-mesh relative" style={{ backgroundColor: "var(--paper)" }}>
      <div className="mx-auto" style={{ maxWidth: 1200, padding: "clamp(40px, 6vw, 88px) 24px clamp(48px, 6vw, 80px)" }}>
        <div className="grid min-w-0 items-center gap-12 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,1fr)] lg:gap-16">
          {/* Left: the promise */}
          <div className="min-w-0 lp-reveal">
            <div className="mb-6 flex flex-wrap items-center gap-3">
              <span className="lp-chip" style={{ borderColor: "var(--ikat-tint)", background: "var(--ikat-tint)", color: "var(--ikat-on-tint)" }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ikat)" }} aria-hidden />
                {t("landing.hero.product_label")}
              </span>
              <PlatformPulse />
            </div>

            <h1 className="lp-display" style={{ margin: 0, fontSize: "clamp(44px, 5.2vw + 12px, 80px)", lineHeight: 0.98 }}>
              {t("landing.hero.hl_1")} {t("landing.hero.hl_2")}{" "}
              <span style={{ whiteSpace: "nowrap" }}>
                {t("landing.hero.hl_3_prefix")}
                <span className="lp-accent">{t("landing.hero.headline_time_num")}</span>
                {t("landing.hero.hl_3_unit")}
              </span>
            </h1>

            <p className="lp-lede" style={{ marginTop: 24, maxWidth: "32ch" }}>
              {t("landing.hero.subhead_plain")}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={HERO_SIGNUP_HREF} className="btn-primary">
                {t("landing.hero.cta_primary_short")}
                <ArrowIcon size={16} color="var(--color-on-primary)" />
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
              className="mono mt-7 flex flex-wrap gap-x-6 gap-y-2 p-0 text-[12px] tracking-[0.02em]"
              style={{ color: "var(--ink-3)", listStyle: "none" }}
            >
              <li className="flex items-center gap-1.5">
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--leaf)" }} aria-hidden />
                {t("landing.hero.perk_trial")}
              </li>
              <li className="flex items-center gap-1.5">
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--leaf)" }} aria-hidden />
                {t("landing.hero.perk_no_card")}
              </li>
              <li className="flex items-center gap-1.5">
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--leaf)" }} aria-hidden />
                {t("landing.hero.perk_uzbek")}
              </li>
            </ul>
          </div>

          {/* Right: the real product surface */}
          <div className="relative min-w-0 lp-reveal">
            <div className="mb-3 flex items-center gap-2">
              <span className="lp-signal" aria-hidden />
              <span className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                {t("landing.hero.proof_label")}
              </span>
            </div>
            <RankingMockup />
            <p className="mt-3 text-[13px] leading-[1.45]" style={{ color: "var(--ink-3)", maxWidth: 480 }}>
              {t("landing.hero.fig_caption")}
            </p>
          </div>
        </div>
      </div>

      <HeroTrustStrip />
    </section>
  );
}
