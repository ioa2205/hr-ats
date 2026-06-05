import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { ArrowIcon, Seal } from "../icons";
import { RankingMockup } from "../mockups";
import { SIGNUP_HREF } from "../constants";
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

      <div className="mx-auto" style={{ maxWidth: 1360, padding: "48px 28px 72px" }}>
        <div
          className="flex flex-wrap items-end gap-x-5 gap-y-2"
          style={{
            marginBottom: 28,
            borderBottom: "2px solid var(--ink)",
            paddingBottom: 14,
          }}
        >
          <span
            className="serif text-[clamp(20px,2vw+10px,30px)] leading-none italic"
            style={{ color: "var(--ink-3)" }}
          >
            {t("landing.hero.masthead_kicker")}
          </span>
          <span className="mono text-[11px] tracking-[0.2em]" style={{ color: "var(--ink-2)" }}>
            {t("landing.hero.masthead_category")}
          </span>
          <span
            className="mono ml-auto text-[11px] tracking-[0.12em]"
            style={{ color: "var(--ink-2)" }}
          >
            {t("landing.hero.masthead_cities")}
          </span>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
          <div className="relative min-w-0">
            <div
              className="mono mb-5 inline-flex items-center gap-2 border border-[var(--ink)] bg-[var(--paper-3)] px-3 py-1.5 text-[10px] tracking-[0.14em]"
              style={{ color: "var(--ink-2)" }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--persimmon)" }}
                aria-hidden
              />
              {t("landing.hero.product_label")}
            </div>
            <h1
              className="serif text-[var(--ink)]"
              style={{
                margin: "4px 0 0",
                fontSize: "clamp(54px, 7vw + 14px, 132px)",
                lineHeight: 0.9,
                letterSpacing: "-0.045em",
                fontWeight: 400,
              }}
            >
              {t("landing.hero.hl_1")}
              <br />
              <span className="relative inline-block">{t("landing.hero.hl_2")}</span>
              <br />
              <span style={{ color: "var(--ink-3)" }}>{t("landing.hero.hl_3_prefix")}</span>
              <span className="pen-circle inline-block">
                <em style={{ fontStyle: "italic", color: "var(--persimmon-2)" }}>
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

          <div className="relative min-w-0 pt-4 lg:pt-6">
            <ProductProofPanel
              label={t("landing.hero.proof_label")}
              title={t("landing.hero.proof_title")}
              rows={[
                [t("landing.hero.proof_1_label"), t("landing.hero.proof_1_value")],
                [t("landing.hero.proof_2_label"), t("landing.hero.proof_2_value")],
                [t("landing.hero.proof_3_label"), t("landing.hero.proof_3_value")],
              ]}
              footer={t("landing.hero.proof_footer")}
            />
            <div className="mt-6 mb-3 flex items-start gap-3">
              <span
                className="mono text-[10px] tracking-[0.18em]"
                style={{ color: "var(--persimmon-2)" }}
              >
                {t("landing.hero.fig_label")}
              </span>
              <span
                className="serif flex-1 text-[13px] leading-[1.35] italic"
                style={{ color: "var(--ink-3)" }}
              >
                {t("landing.hero.fig_caption")}
              </span>
            </div>
            <div className="w-full overflow-hidden pb-6">
              <div className="origin-top-left" style={{ transform: "scale(0.8)", marginLeft: -16 }}>
                <RankingMockup />
              </div>
            </div>

            <div className="absolute hidden lg:block" style={{ bottom: -16, right: 24 }}>
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

function ProductProofPanel({
  label,
  title,
  rows,
  footer,
}: {
  label: string;
  title: string;
  rows: Array<[string, string]>;
  footer: string;
}) {
  return (
    <div
      className="relative border"
      style={{
        borderColor: "var(--ink)",
        background: "var(--paper-3)",
        boxShadow: "8px 8px 0 var(--persimmon)",
      }}
    >
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--ink)" }}
      >
        <span
          className="mono text-[10px] tracking-[0.18em]"
          style={{ color: "var(--persimmon-2)" }}
        >
          {label}
        </span>
        <span className="mono text-[10px] tracking-[0.12em]" style={{ color: "var(--ink-4)" }}>
          RU / UZ / EN
        </span>
      </div>
      <div className="px-4 py-4">
        <h2
          className="serif max-w-[480px] text-[34px] leading-[0.98] tracking-[-0.03em]"
          style={{ color: "var(--ink)" }}
        >
          {title}
        </h2>
        <div className="mt-4 grid gap-2">
          {rows.map(([rowLabel, value]) => (
            <div
              key={rowLabel}
              className="grid items-baseline gap-3 border-t py-2"
              style={{
                gridTemplateColumns: "minmax(72px, 112px) minmax(0, 1fr)",
                borderColor: "var(--ink-4)",
              }}
            >
              <span
                className="mono text-[10px] tracking-[0.12em]"
                style={{ color: "var(--ink-4)" }}
              >
                {rowLabel}
              </span>
              <span
                className="text-[13px] leading-[1.35] font-semibold"
                style={{ minWidth: 0, color: "var(--ink-2)" }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
        <p
          className="mono mt-3 text-[10px] leading-[1.5] tracking-[0.08em]"
          style={{ color: "var(--ink-3)" }}
        >
          {footer}
        </p>
      </div>
    </div>
  );
}
