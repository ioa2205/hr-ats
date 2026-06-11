import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/types";
import { ArrowIcon } from "../icons";
import { SIGNUP_HREF } from "../constants";
import { SectionHeader } from "../section";

const SOURCING_SIGNUP_HREF = `${SIGNUP_HREF}?utm_source=landing&utm_section=sourcing`;

interface SourceCell {
  n: string;
  labelKey: TranslationKey;
  descKey: TranslationKey;
}

const SOURCES: SourceCell[] = [
  { n: "01", labelKey: "landing.sourcing.src1_label", descKey: "landing.sourcing.src1_desc" },
  { n: "02", labelKey: "landing.sourcing.src2_label", descKey: "landing.sourcing.src2_desc" },
  { n: "03", labelKey: "landing.sourcing.src3_label", descKey: "landing.sourcing.src3_desc" },
];

export async function Sourcing() {
  const { t } = await getT();

  return (
    <section id="sourcing" className="relative" style={{ background: "var(--paper)", padding: "clamp(72px, 8vw, 104px) 24px" }}>
      <div className="mx-auto lp-reveal" style={{ maxWidth: 1200 }}>
        <SectionHeader eyebrow={t("landing.sourcing.section_tag")} meta={t("landing.sourcing.section_meta")} maxWidth={820}>
          {t("landing.sourcing.heading")} <span className="lp-accent">{t("landing.sourcing.heading_em")}</span>
        </SectionHeader>

        <p className="lp-lede" style={{ marginTop: -28, marginBottom: 40 }}>
          {t("landing.sourcing.lede")}
        </p>

        <ul className="grid list-none gap-5 p-0 md:grid-cols-3">
          {SOURCES.map((s) => (
            <li key={s.n} className="lp-panel flex flex-col gap-3" style={{ padding: "26px 24px" }}>
              <span className="mono" style={{ fontSize: 11, letterSpacing: "0.14em", color: "var(--ink-4)" }}>{s.n}</span>
              <h3 className="lp-h3 m-0">{t(s.labelKey)}</h3>
              <p className="m-0 text-[14.5px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
                {t(s.descKey)}
              </p>
            </li>
          ))}
        </ul>

        {/* One search, one funnel */}
        <div className="lp-panel mt-8 flex flex-col gap-6 md:flex-row md:items-center" style={{ padding: "28px 28px" }}>
          <div className="md:max-w-[480px]">
            <div className="lp-eyebrow is-accent">{t("landing.sourcing.guarantee_kicker")}</div>
            <p className="mt-3 text-[17px] font-semibold leading-[1.4]" style={{ color: "var(--ink)", margin: "12px 0 0" }}>
              {t("landing.sourcing.guarantee_text")}
            </p>
          </div>
          <div className="mono flex flex-1 flex-wrap items-center gap-x-2.5 gap-y-2 text-[12px] md:justify-end" style={{ color: "var(--ink-3)" }}>
            <span>{t("landing.sourcing.funnel_found")}</span>
            <ArrowIcon size={12} color="var(--ikat)" />
            <span>{t("landing.sourcing.funnel_gate")}</span>
            <ArrowIcon size={12} color="var(--ikat)" />
            <span className="rounded-md px-2 py-1" style={{ background: "var(--ikat-tint)", color: "var(--ikat-on-tint)", fontWeight: 600 }}>
              {t("landing.sourcing.funnel_shortlist")}
            </span>
          </div>
        </div>

        {/* Automation line + CTAs */}
        <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-5">
          <p className="flex-1 lp-h3" style={{ margin: 0, minWidth: 280, color: "var(--ink-2)", fontWeight: 600 }}>
            {t("landing.sourcing.automation_line")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href={SOURCING_SIGNUP_HREF} className="btn-primary">
              {t("landing.sourcing.cta_primary")}
              <ArrowIcon size={16} color="var(--color-on-primary)" />
            </Link>
            <Link href="/product/sourcing" className="btn-ghost">
              {t("landing.sourcing.cta_secondary")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
