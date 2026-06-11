"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/provider";
import { SIGNUP_HREF, TELEGRAM_URL } from "./shared";
import { Icon } from "./mockups";

export function AboutContent() {
  const { t } = useTranslation();

  const values = [
    { t: t("about.values.v1_t"), b: t("about.values.v1_b") },
    { t: t("about.values.v2_t"), b: t("about.values.v2_b") },
    { t: t("about.values.v3_t"), b: t("about.values.v3_b") },
  ];

  return (
    <>
      {/* Hero */}
      <section style={{ background: "var(--paper)", padding: "clamp(48px, 6vw, 80px) 24px clamp(56px, 6vw, 80px)" }}>
        <div className="mx-auto" style={{ maxWidth: 1100 }}>
          <div className="lp-eyebrow is-accent mb-6">{t("about.kicker")}</div>
          <h1 className="lp-display" style={{ margin: 0, maxWidth: 980 }}>
            {t("about.title_a")} <span className="lp-accent">{t("about.title_b")}</span>
          </h1>
          <p className="lp-lede" style={{ marginTop: 28, maxWidth: 680 }}>
            {t("about.subtitle")}
          </p>
        </div>
      </section>

      {/* Story */}
      <section style={{ background: "var(--paper-2)", padding: "clamp(64px, 7vw, 96px) 24px", borderTop: "1px solid var(--rule)" }}>
        <div className="mx-auto" style={{ maxWidth: 1100 }}>
          <div className="lp-eyebrow mb-10">{t("about.story.kicker")}</div>
          <div className="grid gap-6 md:grid-cols-3">
            {[t("about.story.p1"), t("about.story.p2"), t("about.story.p3")].map((para, i) => (
              <div key={i} className="lp-panel" style={{ padding: "26px 24px" }}>
                <div
                  className="mono mb-4 grid h-10 w-10 place-items-center rounded-lg text-[14px]"
                  style={{ background: "var(--ikat-tint)", color: "var(--ikat-on-tint)", fontWeight: 700 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </div>
                <p className="m-0 text-[15.5px] leading-[1.6]" style={{ color: "var(--ink-2)" }}>
                  {para}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section style={{ background: "var(--paper)", padding: "clamp(64px, 7vw, 96px) 24px", borderTop: "1px solid var(--rule)" }}>
        <div className="mx-auto" style={{ maxWidth: 1100 }}>
          <div className="mb-10 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="lp-eyebrow">{t("about.values.kicker")}</span>
            <span className="lp-h3" style={{ color: "var(--ink-3)" }}>
              {t("about.values.title")}
            </span>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {values.map((v, i) => (
              <div key={v.t} className="lp-panel flex flex-col gap-3" style={{ padding: "28px 26px" }}>
                <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-4)" }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="lp-h3 m-0">{v.t}</h3>
                <p className="m-0 text-[14.5px] leading-[1.6]" style={{ color: "var(--ink-3)" }}>
                  {v.b}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission — single calm statement band */}
      <section style={{ background: "var(--night)", color: "var(--on-night)", padding: "clamp(80px, 9vw, 120px) 24px", textAlign: "center" }}>
        <div className="mx-auto" style={{ maxWidth: 940 }}>
          <div className="mb-6 flex items-center justify-center gap-2">
            <span className="lp-signal" aria-hidden />
            <span className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8fc2f5" }}>
              {t("about.mission.kicker")}
            </span>
          </div>
          <p className="lp-h2" style={{ margin: 0, color: "var(--on-night)", fontWeight: 700 }}>
            {t("about.mission.text")}
          </p>
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "var(--paper)", padding: "clamp(64px, 7vw, 96px) 24px", textAlign: "center" }}>
        <div className="mx-auto" style={{ maxWidth: 760 }}>
          <div className="lp-eyebrow is-accent mb-4 justify-center" style={{ display: "inline-flex" }}>
            {t("about.cta.kicker")}
          </div>
          <p className="lp-h3" style={{ margin: "0 auto", maxWidth: 600, color: "var(--ink-2)", fontWeight: 600 }}>
            {t("about.cta.text")}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link href={SIGNUP_HREF} className="btn-primary">
              {t("about.cta.primary")}
              <Icon.arrow size={16} color="var(--color-on-primary)" />
            </Link>
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost">
              <Icon.telegram size={15} color="var(--ikat)" />
              {t("about.cta.secondary")}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
