import { getT } from "@/lib/i18n/server";
import { SectionHeader } from "../section";

export async function PainSolution() {
  const { t } = await getT();
  const pain = [
    { t: t("landing.pain.pain1_t"), v: t("landing.pain.pain1_v"), u: t("landing.pain.pain1_u") },
    { t: t("landing.pain.pain2_t"), v: t("landing.pain.pain2_v"), u: t("landing.pain.pain2_u") },
    { t: t("landing.pain.pain3_t"), v: t("landing.pain.pain3_v"), u: t("landing.pain.pain3_u") },
    { t: t("landing.pain.pain4_t"), v: t("landing.pain.pain4_v"), u: t("landing.pain.pain4_u") },
  ];
  const gain = [
    { t: t("landing.pain.gain1_t"), v: t("landing.pain.gain1_v"), u: t("landing.pain.gain1_u") },
    { t: t("landing.pain.gain2_t"), v: t("landing.pain.gain2_v"), u: t("landing.pain.gain2_u") },
    { t: t("landing.pain.gain3_t"), v: t("landing.pain.gain3_v"), u: t("landing.pain.gain3_u") },
    { t: t("landing.pain.gain4_t"), v: t("landing.pain.gain4_v"), u: t("landing.pain.gain4_u") },
  ];

  return (
    <section style={{ position: "relative", padding: "clamp(72px, 8vw, 104px) 24px", background: "var(--paper-2)" }}>
      <div className="mx-auto lp-reveal" style={{ maxWidth: 1200 }}>
        <SectionHeader eyebrow={t("landing.pain.section_tag")} meta={t("landing.pain.section_meta")} maxWidth={920}>
          {t("landing.pain.heading_a")} {t("landing.pain.heading_b")}{" "}
          <span className="lp-accent">{t("landing.pain.heading_c")}</span>
        </SectionHeader>

        <div className="relative grid items-stretch gap-5 md:grid-cols-2">
          {/* Without */}
          <div className="lp-panel flex flex-col" style={{ padding: "32px 30px", background: "var(--paper-3)" }}>
            <span className="lp-chip self-start" style={{ color: "var(--ink-4)" }}>{t("landing.pain.badge_without")}</span>
            <div className="mt-5 flex items-baseline gap-2.5">
              <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", color: "var(--ink-3)" }}>
                {t("landing.pain.time_before")}
              </span>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-4)" }}>{t("landing.pain.time_before_v")}</span>
            </div>
            <div className="mt-5 flex flex-col">
              {pain.map((p) => (
                <div key={p.t + p.v} className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3.5" style={{ borderTop: "1px solid var(--rule)" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 500, color: "var(--ink-2)", letterSpacing: "-0.01em" }}>{p.t}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2, letterSpacing: "0.04em" }}>{p.u}</div>
                  </div>
                  <div className="mono" style={{ fontSize: 22, color: "var(--ink-3)", letterSpacing: "-0.02em", fontWeight: 600 }}>{p.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg px-4 py-3" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 4 }}>
                {t("landing.pain.summary_label")}
              </div>
              <div style={{ fontSize: 20, fontWeight: 600, color: "var(--ink-3)" }}>{t("landing.pain.summary_without")}</div>
            </div>
          </div>

          {/* With TezHR */}
          <div className="lp-panel flex flex-col" style={{ padding: "32px 30px", borderColor: "var(--ikat)", boxShadow: "var(--shadow-level-2)" }}>
            <span
              className="lp-chip self-start"
              style={{ background: "var(--ikat)", color: "var(--color-on-primary)", borderColor: "var(--ikat)" }}
            >
              {t("landing.pain.badge_with")}
            </span>
            <div className="mt-5 flex items-baseline gap-2.5">
              <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-0.03em", color: "var(--ikat)" }}>
                {t("landing.pain.time_after")}
              </span>
              <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{t("landing.pain.time_after_v")}</span>
            </div>
            <div className="mt-5 flex flex-col">
              {gain.map((p) => (
                <div key={p.t + p.v} className="grid grid-cols-[1fr_auto] items-baseline gap-4 py-3.5" style={{ borderTop: "1px solid var(--rule)" }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", letterSpacing: "-0.01em" }}>{p.t}</div>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 2, letterSpacing: "0.04em" }}>{p.u}</div>
                  </div>
                  <div className="mono" style={{ fontSize: 24, color: "var(--ikat)", letterSpacing: "-0.02em", fontWeight: 700 }}>{p.v}</div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg px-4 py-3" style={{ background: "var(--ikat-tint)" }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ikat-on-tint)", marginBottom: 4 }}>
                {t("landing.pain.summary_label")}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ikat-on-tint)" }}>{t("landing.pain.summary_with")}</div>
            </div>
          </div>

          {/* vs marker */}
          <div
            aria-hidden
            className="absolute left-1/2 top-1/2 hidden h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full md:grid"
            style={{ background: "var(--paper-3)", border: "1px solid var(--rule-strong)", boxShadow: "var(--shadow-level-1)" }}
          >
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "var(--ink-3)" }}>
              {t("landing.pain.vs")}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
