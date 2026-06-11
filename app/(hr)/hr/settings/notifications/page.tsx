export const dynamic = "force-dynamic";

import { requireCompanyAccess } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale, t } from "@/lib/i18n";
import { SettingsPageHeader } from "@/components/hr/settings/settings-page-header";
import { PreferencesForm } from "@/components/hr/settings/notifications/preferences-form";

export default async function NotificationsSettingsPage() {
  const { user, companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const admin = createAdminClient();

  let { data: prefs } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!prefs) {
    const { data: inserted } = await admin
      .from("notification_preferences")
      .insert({ user_id: user.id, company_id: companyId })
      .select("*")
      .single();
    prefs = inserted ?? null;
  }

  return (
    <section>
      <SettingsPageHeader
        title={t("hr.settings.notifications.title", locale)}
        sub={t("hr.settings.notifications.subtitle", locale)}
      />
      {prefs ? (
        <PreferencesForm initial={prefs} />
      ) : (
        <div className="text-[13px] text-[var(--color-text-muted)]">{t("common.error", locale)}</div>
      )}
    </section>
  );
}
