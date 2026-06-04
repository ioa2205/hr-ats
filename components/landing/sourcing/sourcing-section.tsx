import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/types";
import { ArrowIcon } from "../icons";
import { SIGNUP_HREF } from "../constants";

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
    <section
      id="sourcing"
      className="paper-grain relative"
      style={{ background: "var(--paper)", padding: "100px 28px 120px" }}
    >
      <div className="mx-auto" style={{ maxWidth: 1360 }}>
        {/* Editorial header bar */}
        <div
          className="mb-6 flex flex-wrap items-end gap-x-7 gap-y-2 border-b pb-3.5"
          style={{ borderColor: "var(--ink)" }}
        >
          <span className="mono text-[11px] tracking-[0.2em]" style={{ color: "var(--persimmon-2)" }}>
            {t("landing.sourcing.section_tag")}
          </span>
          <span className="serif text-[20px] italic" style={{ color: "var(--ink-3)" }}>
            {t("landing.sourcing.section_title")}
          </span>
          <span className="mono ml-auto text-[11px] tracking-[0.18em]" style={{ color: "var(--ink-3)" }}>
            {t("landing.sourcing.section_meta")}
          </span>
        </div>

        {/* Headline + lede */}
        <div
          className="grid gap-x-14 gap-y-6 lg:grid-cols-[1.2fr_1fr] lg:items-end"
          style={{ marginBottom: 48 }}
        >
          <h2
            className="serif"
            style={{
              margin: 0,
              fontSize: "clamp(40px, 5vw + 16px, 82px)",
              lineHeight: 0.96,
              letterSpacing: "-0.035em",
              maxWidth: 760,
            }}
          >
            {t("landing.sourcing.heading")}{" "}
            <em style={{ fontStyle: "italic", color: "var(--persimmon-2)" }}>
              {t("landing.sourcing.heading_em")}
            </em>
          </h2>
          <p
            className="serif text-[clamp(16px,1vw+10px,20px)] italic leading-[1.5]"
            style={{ color: "var(--ink-3)", margin: 0 }}
          >
            {t("landing.sourcing.lede")}
          </p>
        </div>

        {/* Three sources, one search */}
        <ul
          className="grid gap-0 p-0 md:grid-cols-3"
          style={{
            listStyle: "none",
            borderTop: "2px solid var(--ink)",
            borderBottom: "2px solid var(--ink)",
          }}
        >
          {SOURCES.map((s, i) => (
            <li
              key={s.n}
              className="flex flex-col gap-4"
              style={{
                padding: "32px 28px",
                borderRight: i < SOURCES.length - 1 ? "1px solid var(--ink)" : "0",
                background: "var(--paper)",
              }}
            >
              <span
                className="serif text-[54px] leading-none tracking-[-0.035em]"
                style={{ color: "var(--persimmon-2)" }}
              >
                {s.n}
              </span>
              <h3 className="serif m-0 text-[26px] leading-[1.06] tracking-[-0.02em]">
                {t(s.labelKey)}
              </h3>
              <p
                className="m-0 max-w-[320px] text-[14px] leading-[1.55]"
                style={{ color: "var(--ink-2)" }}
              >
                {t(s.descKey)}
              </p>
            </li>
          ))}
        </ul>

        {/* Guarantee strip + funnel cue */}
        <div
          className="mt-10 flex flex-col gap-6 md:flex-row md:items-center"
          style={{ background: "var(--ink)", color: "var(--paper-3)", padding: "28px 32px" }}
        >
          <div className="md:max-w-[520px]">
            <div className="mono text-[10px] tracking-[0.22em]" style={{ color: "var(--saffron)" }}>
              {t("landing.sourcing.guarantee_kicker")}
            </div>
            <p className="serif text-[18px] italic leading-[1.4]" style={{ margin: "8px 0 0" }}>
              {t("landing.sourcing.guarantee_text")}
            </p>
          </div>
          <div
            className="mono flex flex-1 flex-wrap items-center gap-x-3 gap-y-2 text-[11px] tracking-[0.06em] md:justify-end"
            style={{ color: "#C8C0B0" }}
          >
            <span>{t("landing.sourcing.funnel_found")}</span>
            <ArrowIcon size={12} color="var(--saffron)" />
            <span>{t("landing.sourcing.funnel_gate")}</span>
            <ArrowIcon size={12} color="var(--saffron)" />
            <span style={{ color: "var(--paper-3)" }}>{t("landing.sourcing.funnel_shortlist")}</span>
          </div>
        </div>

        {/* Automation line + CTAs */}
        <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-5">
          <p
            className="serif flex-1 text-[clamp(18px,1.5vw+10px,26px)] italic leading-[1.3]"
            style={{ color: "var(--ink)", margin: 0, minWidth: 280 }}
          >
            {t("landing.sourcing.automation_line")}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href={SOURCING_SIGNUP_HREF} className="btn-primary">
              {t("landing.sourcing.cta_primary")}
              <ArrowIcon size={14} color="var(--paper-3)" />
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
