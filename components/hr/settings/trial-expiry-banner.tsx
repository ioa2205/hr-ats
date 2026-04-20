import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { getQuotaState } from "@/lib/companies/quota";
import { getLocale, t } from "@/lib/i18n";

export async function TrialExpiryBanner({ companyId }: { companyId: string }) {
  const quota = await getQuotaState(companyId);
  const locale = await getLocale();
  if (!quota) return null;

  const shouldShow =
    (quota.status === "trialing" && quota.daysRemaining <= 3) ||
    quota.status === "expired";
  if (!shouldShow) return null;

  return (
    <div
      role="alert"
      className="mb-4 flex items-center justify-between gap-3 rounded-[6px] border border-[color:var(--color-tez-amber)]/40 bg-[color:var(--color-tez-amber-tint)] px-3.5 py-2.5"
    >
      <div className="flex min-w-0 items-start gap-2">
        <AlertTriangle className="text-tez-amber mt-[2px] h-4 w-4 shrink-0" />
        <div className="min-w-0">
          <div className="text-ink text-[13px] font-semibold">
            {t("hr.settings.trial_banner.title", locale)}
          </div>
          <div className="text-ink-3 mt-0.5 text-[12px]">
            {t("hr.settings.trial_banner.body", locale, {
              days: String(Math.max(0, quota.daysRemaining)),
            })}
          </div>
        </div>
      </div>
      <Link
        href="/hr/settings/billing"
        className="bg-persimmon hover:bg-persimmon-2 text-paper inline-flex h-7 shrink-0 items-center rounded-[4px] px-3 text-[12px] font-semibold transition-colors"
      >
        {t("hr.settings.trial_banner.cta", locale)}
      </Link>
    </div>
  );
}
