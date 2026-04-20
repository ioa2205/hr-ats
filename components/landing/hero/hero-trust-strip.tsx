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
      className="border-y border-[var(--paper-3)]/20"
      style={{ background: "var(--ink)", color: "var(--paper-3)" }}
    >
      <div
        className="mx-auto flex flex-col items-stretch gap-0 px-7 md:flex-row md:items-center md:divide-x md:divide-[rgba(247,242,230,0.18)]"
        style={{ maxWidth: 1360, padding: "20px 28px" }}
      >
        <div
          className="mono pb-3 text-[10px] tracking-[0.22em] md:pb-0 md:pr-6"
          style={{ color: "var(--saffron)" }}
        >
          {t("landing.hero.trust_title")}
        </div>
        <div className="flex flex-1 flex-wrap items-center gap-x-10 gap-y-2 md:pl-6">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline gap-2">
              <span
                className="mono text-[10px] tracking-[0.14em]"
                style={{ color: "#C8C0B0" }}
              >
                {r.label}
              </span>
              <span className="serif text-[15px] italic tracking-[-0.005em]">{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
