import { getT } from "@/lib/i18n/server";
import { getHealthSnapshot } from "@/lib/landing/health";

export async function StatusPill() {
  const [{ status }, { t }] = await Promise.all([getHealthSnapshot(), getT()]);
  const color =
    status === "ok"
      ? "var(--leaf)"
      : status === "degraded"
        ? "var(--saffron)"
        : "var(--color-danger)";
  const label =
    status === "ok"
      ? t("landing.footer.status_ok")
      : status === "degraded"
        ? t("landing.footer.status_degraded")
        : t("landing.footer.status_down");
  return (
    <span
      className="mono inline-flex items-center gap-2 text-[11px] tracking-[0.06em]"
      style={{ color: "var(--ink-3)" }}
      aria-live="polite"
    >
      <span
        className="inline-block"
        style={{ width: 7, height: 7, borderRadius: "50%", background: color }}
      />
      {label}
    </span>
  );
}
