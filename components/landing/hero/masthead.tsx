import { getT } from "@/lib/i18n/server";
import { formatEditionLabel, formatLandingDate } from "@/lib/landing/format";
import { PlatformPulse } from "./platform-pulse";

export async function Masthead() {
  const { locale, t } = await getT();
  const now = new Date();
  const edition = formatEditionLabel(now, locale);
  const dateLabel = formatLandingDate(now, locale);
  return (
    <div
      className="mx-auto flex items-center justify-between gap-4 px-7 text-[10px] tracking-[0.14em]"
      style={{
        borderBottom: "1px solid var(--ink)",
        padding: "10px 28px",
        fontFamily: "var(--font-jetbrains-mono),monospace",
        color: "var(--ink-2)",
      }}
    >
      <span className="truncate">
        {t("landing.meta.edition_prefix")} {edition} · {dateLabel}
      </span>
      <span className="hidden sm:inline">
        <PlatformPulse />
      </span>
      <span className="whitespace-nowrap">{t("landing.meta.free_trial_badge")}</span>
    </div>
  );
}
