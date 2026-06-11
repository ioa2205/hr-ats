import Link from "next/link";
import { AlertTriangle, Lock } from "lucide-react";
import { getQuotaState } from "@/lib/companies/quota";
import { t } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

interface QuotaBannerProps {
  companyId: string;
  locale: Locale;
}

export async function QuotaBanner({ companyId, locale }: QuotaBannerProps) {
  const quota = await getQuotaState(companyId);
  if (!quota) return null;

  // Paid / active: no banner
  if (quota.status === "active") return null;

  const isReadOnly = !quota.canWrite;
  const isTrialing = quota.status === "trialing" && quota.canWrite;

  if (isReadOnly) {
    return (
      <Link
        href="/hr/settings/billing"
        className={cn(
          "mx-2.5 mb-2.5 block rounded-[4px] border px-2.5 py-2 text-[11px] transition-colors",
          "border-[color:var(--color-danger-container)] bg-[color:var(--color-danger-container)] text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger-container)]/80",
        )}
      >
        <div className="mb-1 flex items-center gap-1.5 font-semibold">
          <Lock className="h-3.5 w-3.5 shrink-0" />
          {t("quota.readonly_title", locale)}
        </div>
        <p className="leading-snug opacity-90">{t("quota.trial_expired_banner", locale)}</p>
      </Link>
    );
  }

  if (isTrialing) {
    const isLowDays = quota.daysRemaining <= 3;
    const used = quota.cvQuotaUsed;
    const limit = quota.cvQuotaLimit;
    const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
    const cvOut = limit > 0 && used >= limit;
    const cvLow = !cvOut && pct >= 80;

    // Escalate the upgrade prompt as the CV budget runs out, so HR notices the
    // limit before applications silently stop being screened.
    const escalation = cvOut
      ? t("quota.cv_out_banner", locale)
      : cvLow
        ? t("quota.cv_low_banner", locale)
        : null;
    const amber = cvLow || isLowDays;

    return (
      <Link
        href="/hr/settings/billing"
        className={cn(
          "group mx-2.5 mb-2.5 block rounded-[4px] border px-2.5 py-2 text-[11px] transition-colors",
          cvOut
            ? "border-[color:var(--color-danger-container)] bg-[color:var(--color-danger-container)] text-[color:var(--color-danger)] hover:bg-[color:var(--color-danger-container)]/80"
            : amber
              ? "border-[var(--color-line)] bg-[var(--color-canvas)] hover:bg-[var(--color-surface-subtle)] border-[color:var(--color-warning)]/40"
              : "border-[var(--color-line)] bg-[var(--color-canvas)] hover:bg-[var(--color-surface-subtle)]",
        )}
      >
        {escalation && (
          <div className="mb-1 flex items-center gap-1.5 font-semibold">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {escalation}
          </div>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[var(--color-text-muted)] flex items-center gap-1.5 text-[10.5px] font-medium">
            {isLowDays && !escalation && <AlertTriangle className="h-3 w-3 shrink-0" />}
            {t("quota.trial_banner", locale)} ·{" "}
            {t("team.days_left", locale, { days: String(quota.daysRemaining) })}
          </span>
          <span
            className="text-[var(--color-text)] text-[10.5px]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {used} / {limit}
          </span>
        </div>
        <div className="bg-[var(--color-surface-strong)] relative mt-1.5 h-[3px] overflow-hidden rounded-[2px]">
          <span
            aria-hidden
            className={cn(
              "absolute inset-y-0 left-0 rounded-[2px]",
              cvOut
                ? "bg-[color:var(--color-danger)]"
                : amber
                  ? "bg-[color:var(--color-warning)]"
                  : "bg-[var(--color-text-muted)]",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </Link>
    );
  }

  return null;
}
