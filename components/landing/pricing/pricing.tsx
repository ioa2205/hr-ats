import { getT } from "@/lib/i18n/server";
import { SIGNUP_HREF, TELEGRAM_URL } from "../constants";
import { SectionHeader } from "../section";
import { ComparisonTable } from "./comparison-table";
import { FAQ } from "./faq";
import { PlanCard, PlanCtaLink } from "./plan-card";

const TRIAL_HREF = `${SIGNUP_HREF}?utm_source=landing&utm_section=pricing_trial`;
// Paid billing isn't live yet — the Pro plan routes to the team instead of a checkout flow.
const PRO_HREF = TELEGRAM_URL;

export async function Pricing() {
  const { t } = await getT();

  const comparisonRows = [
    { label: t("landing.pricing.cmp.active_jobs"), trial: t("landing.pricing.cmp.active_jobs_trial"), pro: t("landing.pricing.cmp.active_jobs_pro") },
    { label: t("landing.pricing.cmp.cv_month"), trial: t("landing.pricing.cmp.cv_month_trial"), pro: t("landing.pricing.cmp.cv_month_pro") },
    { label: t("landing.pricing.cmp.ai"), trial: t("landing.pricing.cmp.ai_trial"), pro: t("landing.pricing.cmp.ai_pro"), note: t("landing.pricing.cmp.ai_note") },
    { label: t("landing.pricing.cmp.langs"), trial: t("landing.pricing.cmp.langs_trial"), pro: t("landing.pricing.cmp.langs_pro") },
    { label: t("landing.pricing.cmp.branding"), trial: t("landing.pricing.cmp.branding_trial"), pro: t("landing.pricing.cmp.branding_pro") },
    { label: t("landing.pricing.cmp.seats"), trial: t("landing.pricing.cmp.seats_trial"), pro: t("landing.pricing.cmp.seats_pro") },
    { label: t("landing.pricing.cmp.sso"), trial: t("landing.pricing.cmp.sso_trial"), pro: t("landing.pricing.cmp.sso_pro") },
    {
      label: t("landing.pricing.cmp.residency"),
      trial: t("landing.pricing.cmp.residency_trial"),
      pro: t("landing.pricing.cmp.residency_pro"),
      note: t("landing.pricing.cmp.residency_note"),
    },
    { label: t("landing.pricing.cmp.sla"), trial: t("landing.pricing.cmp.sla_trial"), pro: t("landing.pricing.cmp.sla_pro") },
    { label: t("landing.pricing.cmp.api"), trial: t("landing.pricing.cmp.api_trial"), pro: t("landing.pricing.cmp.api_pro") },
  ];

  const faqItems = [1, 2, 3, 4, 5, 6, 7].map((i) => ({
    q: t(`landing.pricing.faq_q_${i}` as "landing.pricing.faq_q_1"),
    a: t(`landing.pricing.faq_a_${i}` as "landing.pricing.faq_a_1"),
  }));

  return (
    <section id="pricing" className="relative" style={{ background: "var(--paper)", padding: "clamp(72px, 8vw, 104px) 24px" }}>
      <div className="mx-auto lp-reveal" style={{ maxWidth: 1200 }}>
        <SectionHeader eyebrow={t("landing.pricing.section_tag")} meta={t("landing.pricing.section_meta")} maxWidth={1000}>
          {t("landing.pricing.heading")} <span className="lp-accent">{t("landing.pricing.heading_em")}</span> {t("landing.pricing.heading_tail")}
        </SectionHeader>

        <div className="grid gap-5 md:grid-cols-2">
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
            ctaSlot={<PlanCtaLink href={TRIAL_HREF} label={t("landing.pricing.trial_cta")} isPrimary />}
            note={t("landing.pricing.trial_note")}
            variant="primary"
          />
          <PlanCard
            tag={t("landing.pricing.pro_tag")}
            tagBadge={t("landing.pricing.pro_badge_new")}
            name={t("landing.pricing.pro_name")}
            tagline={t("landing.pricing.pro_tagline")}
            comingSoonLabel={t("landing.pricing.pro_coming_soon")}
            features={[
              t("landing.pricing.pro_f1_new"),
              t("landing.pricing.pro_f2_new"),
              t("landing.pricing.pro_f3_new"),
              t("landing.pricing.pro_f4_new"),
              t("landing.pricing.pro_f5_new"),
            ]}
            ctaSlot={<PlanCtaLink href={PRO_HREF} label={t("landing.pricing.pro_cta_new")} isPrimary={false} external />}
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
