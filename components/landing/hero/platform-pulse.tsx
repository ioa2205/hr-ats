import { getPlatformMetrics } from "@/lib/landing/metrics";
import { formatInt } from "@/lib/landing/format";
import { getT } from "@/lib/i18n/server";

export async function PlatformPulse() {
  const metrics = await getPlatformMetrics();
  if (!metrics || metrics.cvs_processed_today === null || metrics.cvs_processed_today <= 0) {
    return null;
  }
  const { locale, t } = await getT();
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="lp-live-dot inline-block"
        style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--persimmon)" }}
        aria-hidden
      />
      <span className="mono" style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--ink-3)" }}>
        {t("landing.hero.pulse_today", {
          count: formatInt(metrics.cvs_processed_today, locale),
        })}
      </span>
    </span>
  );
}
