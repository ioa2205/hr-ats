export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getLocale, t } from "@/lib/i18n";
import { SettingsHeader } from "@/components/hr/design";
import { CompanyClient } from "@/components/hr/settings/company/company-client";
import type { Locale } from "@/lib/i18n/types";

export default async function CompanySettingsPage() {
  const { companyId, role, user } = await requireCompanyAccess();
  const locale = await getLocale();
  const admin = createAdminClient();

  const [{ data: company }, { data: members }] = await Promise.all([
    admin
      .from("companies")
      .select("id, name, slug, logo_url, default_locale")
      .eq("id", companyId)
      .single(),
    admin
      .from("company_members")
      .select("role, user_id, profiles!inner(full_name, email)")
      .eq("company_id", companyId)
      .in("role", ["owner", "admin"]),
  ]);

  const normalizedMembers = (members ?? []).map((m) => {
    const p = m.profiles as unknown as { full_name: string; email: string };
    return {
      id: m.user_id,
      name: p.full_name,
      email: p.email,
      role: m.role as "owner" | "admin",
    };
  });

  const owners = normalizedMembers.filter((m) => m.role === "owner");
  const admins = normalizedMembers.filter((m) => m.role === "admin");

  return (
    <section>
      <SettingsHeader
        title={t("hr.settings.company.title", locale)}
        sub={t("hr.settings.company.subtitle", locale)}
      />
      <CompanyClient
        isOwner={role === "owner"}
        canEdit={role === "owner" || role === "admin"}
        selfId={user.id}
        company={{
          id: company?.id ?? companyId,
          name: company?.name ?? "",
          slug: company?.slug ?? "",
          logoUrl: company?.logo_url ?? null,
          defaultLocale: (company?.default_locale ?? "ru") as Locale,
        }}
        admins={admins}
        owners={owners}
      />
    </section>
  );
}
