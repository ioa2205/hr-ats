import { getT } from "@/lib/i18n/server";

export async function HeroTrustStrip() {
  const { t } = await getT();
  const rows = [
    { label: t("landing.hero.trust_1_label"), value: t("landing.hero.trust_1_value") },
    { label: t("landing.hero.trust_2_label"), value: t("landing.hero.trust_2_value") },
    { label: t("landing.hero.trust_3_label"), value: t("landing.hero.trust_3_value") },
    { label: t("landing.hero.trust_4_label"), value: t("landing.hero.trust_4_value") },
  ];
  return (
    <aside
      aria-label={t("landing.hero.trust_title")}
      style={{ borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}
    >
      <div
        className="mx-auto grid grid-cols-2 gap-x-8 gap-y-5 md:grid-cols-4"
        style={{ maxWidth: 1200, padding: "24px" }}
      >
        {rows.map((r) => (
          <div key={r.label} className="flex flex-col gap-1">
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-4)" }}>
              {r.label}
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>{r.value}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}
