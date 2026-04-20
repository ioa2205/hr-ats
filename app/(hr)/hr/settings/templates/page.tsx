export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getLocale, t } from "@/lib/i18n";
import { SettingsHeader } from "@/components/hr/design";
import { TemplatesEditor } from "@/components/hr/settings/templates/templates-editor";

const TEMPLATE_KEYS = [
  "telegram_invite_ru",
  "telegram_invite_uz",
  "telegram_invite_en",
] as const;

export default async function TemplatesSettingsPage() {
  const { companyId, role } = await requireCompanyAccess();
  const locale = await getLocale();
  const admin = createAdminClient();
  const canEdit = role === "owner" || role === "admin";

  const [{ data: overrides }, { data: defaults }] = await Promise.all([
    admin
      .from("company_settings")
      .select("key, value")
      .eq("company_id", companyId)
      .in("key", TEMPLATE_KEYS as unknown as string[]),
    admin
      .from("platform_settings")
      .select("key, value")
      .in("key", TEMPLATE_KEYS as unknown as string[]),
  ]);

  const overrideMap = new Map((overrides ?? []).map((r) => [r.key, r.value]));
  const defaultMap = new Map((defaults ?? []).map((r) => [r.key, r.value]));
  const read = (key: (typeof TEMPLATE_KEYS)[number]) =>
    overrideMap.get(key) ?? defaultMap.get(key) ?? "";
  const def = (key: (typeof TEMPLATE_KEYS)[number]) => defaultMap.get(key) ?? "";

  return (
    <section>
      <SettingsHeader
        title={t("hr.settings.templates.title", locale)}
        sub={t("hr.settings.templates.subtitle", locale)}
      />
      <TemplatesEditor
        canEdit={canEdit}
        hasOverrides={overrideMap.size > 0}
        initial={{
          ru: read("telegram_invite_ru"),
          uz: read("telegram_invite_uz"),
          en: read("telegram_invite_en"),
        }}
        defaults={{
          ru: def("telegram_invite_ru"),
          uz: def("telegram_invite_uz"),
          en: def("telegram_invite_en"),
        }}
      />
    </section>
  );
}
