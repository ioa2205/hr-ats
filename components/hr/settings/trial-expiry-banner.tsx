import Link from "next/link";
import { Alert, Button } from "@/components/ui";
import { getQuotaState } from "@/lib/companies/quota";
import { getLocale, t } from "@/lib/i18n";

export async function TrialExpiryBanner({ companyId }: { companyId: string }) {
  const quota = await getQuotaState(companyId);
  const locale = await getLocale();
  if (!quota) return null;

  const shouldShow =
    (quota.status === "trialing" && quota.daysRemaining <= 3) || quota.status === "expired";
  if (!shouldShow) return null;

  return (
    <Alert
      tone="warning"
      title={t("hr.settings.trial_banner.title", locale)}
      action={
        <Button asChild size="sm" variant="accent">
          <Link href="/hr/settings/billing">{t("hr.settings.trial_banner.cta", locale)}</Link>
        </Button>
      }
      className="mb-4"
    >
      {t("hr.settings.trial_banner.body", locale, {
        days: String(Math.max(0, quota.daysRemaining)),
      })}
    </Alert>
  );
}
