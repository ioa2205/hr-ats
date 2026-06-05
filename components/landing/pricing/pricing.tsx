import { getT } from "@/lib/i18n/server";
import { formatUZS } from "@/lib/landing/format";
import { SIGNUP_HREF } from "../constants";
import { ComparisonTable } from "./comparison-table";
import { FAQ } from "./faq";
import { PlanCard, PlanCtaLink } from "./plan-card";

const PRO_MIN_UZS = 1_500_000;
const PRO_MIN_USD = 120;

const TRIAL_HREF = `${SIGNUP_HREF}?utm_source=landing&utm_section=pricing_trial`;
const PRO_HREF = "/upgrade?source=landing_pricing";

export async function Pricing() {
  const { locale, t } = await getT();

  const useUSD = locale === "en";
  const proPrice = useUSD ? `$${PRO_MIN_USD}` : formatUZS(PRO_MIN_UZS, locale).split(" ")[0];
  const proUnit = useUSD ? t("landing.pricing.pro_unit_en") : t("landing.pricing.pro_unit");
  const proPriceSub = useUSD
    ? t("landing.pricing.pro_subline_uzs", {
        value: formatUZS(PRO_MIN_UZS, locale),
      })
    : t("landing.pricing.pro_subline_usd", { value: `$${PRO_MIN_USD}` });

  const comparisonRows = [
    {
      label: t("landing.pricing.cmp.active_jobs"),
      trial: t("landing.pricing.cmp.active_jobs_trial"),
      pro: t("landing.pricing.cmp.active_jobs_pro"),
    },
    {
      label: t("landing.pricing.cmp.cv_month"),
      trial: t("landing.pricing.cmp.cv_month_trial"),
      pro: t("landing.pricing.cmp.cv_month_pro"),
    },
    {
      label: t("landing.pricing.cmp.ai"),
      trial: t("landing.pricing.cmp.ai_trial"),
      pro: t("landing.pricing.cmp.ai_pro"),
      note: t("landing.pricing.cmp.ai_note"),
    },
    {
      label: t("landing.pricing.cmp.langs"),
      trial: t("landing.pricing.cmp.langs_trial"),
      pro: t("landing.pricing.cmp.langs_pro"),
    },
    {
      label: t("landing.pricing.cmp.branding"),
      trial: t("landing.pricing.cmp.branding_trial"),
      pro: t("landing.pricing.cmp.branding_pro"),
    },
    {
      label: t("landing.pricing.cmp.seats"),
      trial: t("landing.pricing.cmp.seats_trial"),
      pro: t("landing.pricing.cmp.seats_pro"),
    },
    {
      label: t("landing.pricing.cmp.sso"),
      trial: t("landing.pricing.cmp.sso_trial"),
      pro: t("landing.pricing.cmp.sso_pro"),
    },
    {
      label: t("landing.pricing.cmp.residency"),
      trial: t("landing.pricing.cmp.residency_trial"),
      pro: t("landing.pricing.cmp.residency_pro"),
      note: t("landing.pricing.cmp.residency_note"),
    },
    {
      label: t("landing.pricing.cmp.sla"),
      trial: t("landing.pricing.cmp.sla_trial"),
      pro: t("landing.pricing.cmp.sla_pro"),
    },
    {
      label: t("landing.pricing.cmp.api"),
      trial: t("landing.pricing.cmp.api_trial"),
      pro: t("landing.pricing.cmp.api_pro"),
    },
  ];

  const faqItems = [1, 2, 3, 4, 5, 6, 7].map((i) => ({
    q: t(`landing.pricing.faq_q_${i}` as "landing.pricing.faq_q_1"),
    a: t(`landing.pricing.faq_a_${i}` as "landing.pricing.faq_a_1"),
  }));

  return (
    <section
      id="pricing"
      className="paper-grain relative"
      style={{ background: "var(--paper)", padding: "120px 28px 100px" }}
    >
      <div className="mx-auto" style={{ maxWidth: 1360 }}>
        <div
          className="mb-6 flex flex-wrap items-end gap-7 border-b pb-3.5"
          style={{ borderColor: "var(--ink)" }}
        >
          <span
            className="mono text-[11px] tracking-[0.2em]"
            style={{ color: "var(--persimmon-2)" }}
          >
            {t("landing.pricing.section_tag")}
          </span>
          <span className="serif text-[20px] italic" style={{ color: "var(--ink-3)" }}>
            {t("landing.pricing.section_title")}
          </span>
          <span
            className="mono ml-auto text-[11px] tracking-[0.18em]"
            style={{ color: "var(--ink-3)" }}
          >
            {t("landing.pricing.section_meta")}
          </span>
        </div>
        <h2
          className="serif max-w-[1100px]"
          style={{
            margin: "0 0 60px",
            fontSize: "clamp(40px, 5vw + 16px, 82px)",
            lineHeight: 0.94,
            letterSpacing: "-0.035em",
          }}
        >
          {t("landing.pricing.heading")}{" "}
          <em style={{ fontStyle: "italic", color: "var(--persimmon-2)" }}>
            {t("landing.pricing.heading_em")}
          </em>{" "}
          {t("landing.pricing.heading_tail")}
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <PlanCard
            tag={t("landing.pricing.trial_tag")}
            name={t("landing.pricing.trial_name")}
            tagline={t("landing.pricing.trial_tagline")}
            priceLine="0"
            unit={t("landing.pricing.trial_unit")}
            features={[
              t("landing.pricing.trial_f1_new"),
              t("landing.pricing.trial_f2_new"),
              t("landing.pricing.trial_f3_new"),
              t("landing.pricing.trial_f4_new"),
              t("landing.pricing.trial_f5_new"),
            ]}
            ctaSlot={
              <PlanCtaLink href={TRIAL_HREF} label={t("landing.pricing.trial_cta")} isPrimary />
            }
            note={t("landing.pricing.trial_note")}
            variant="primary"
          />
          <PlanCard
            tag={t("landing.pricing.pro_tag")}
            tagBadge={t("landing.pricing.pro_badge_new")}
            name={t("landing.pricing.pro_name")}
            tagline={t("landing.pricing.pro_tagline")}
            priceLine={t("landing.pricing.pro_price_line", { price: proPrice })}
            priceSub={proPriceSub}
            unit={proUnit}
            features={[
              t("landing.pricing.pro_f1_new"),
              t("landing.pricing.pro_f2_new"),
              t("landing.pricing.pro_f3_new"),
              t("landing.pricing.pro_f4_new"),
              t("landing.pricing.pro_f5_new"),
            ]}
            ctaSlot={
              <PlanCtaLink
                href={PRO_HREF}
                label={t("landing.pricing.pro_cta_new")}
                isPrimary={false}
              />
            }
            note={t("landing.pricing.pro_note_new")}
            variant="secondary"
          />
        </div>

        <ComparisonTable
          rows={comparisonRows}
          trialLabel={t("landing.pricing.trial_name")}
          proLabel={t("landing.pricing.pro_name")}
          featureLabel={t("landing.pricing.cmp.feature_col")}
          toggleOpen={t("landing.pricing.cmp.toggle_open")}
          toggleClose={t("landing.pricing.cmp.toggle_close")}
        />

        <FAQ items={faqItems} heading={t("landing.pricing.faq_heading")} />
      </div>
    </section>
  );
}
