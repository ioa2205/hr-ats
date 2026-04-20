import { SettingsNav } from "@/components/hr/settings/settings-nav";
import { SettingsBreadcrumb } from "@/components/hr/settings/settings-breadcrumb";
import { TrialExpiryBanner } from "@/components/hr/settings/trial-expiry-banner";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getSettingsWarnings } from "@/lib/settings/warnings";
import { getLocale, t } from "@/lib/i18n";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { role, companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const warnings = await getSettingsWarnings(companyId);

  return (
    <div>
      <TrialExpiryBanner companyId={companyId} />
      <div className="mb-6">
        <div
          className="text-ink-5 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em]"
          style={{ fontFamily: "var(--font-tez-mono)" }}
        >
          {t("hr.settings.eyebrow", locale)}
        </div>
        <h1 className="text-ink text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]">
          {t("hr.settings.title", locale)}
        </h1>
        <p className="text-ink-4 mt-1.5 max-w-[580px] text-[13px] leading-[1.5]">
          {t("hr.settings.subtitle", locale)}
        </p>
      </div>

      <div className="flex flex-col gap-0 lg:flex-row lg:gap-8">
        <SettingsNav role={role} warnings={warnings} />
        <div className="min-w-0 flex-1 lg:pt-1">
          <SettingsBreadcrumb />
          {children}
        </div>
      </div>
    </div>
  );
}
