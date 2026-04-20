export const dynamic = "force-dynamic";

import { requireUser } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getLocale, t } from "@/lib/i18n";
import { SettingsHeader } from "@/components/hr/design";
import { ProfileClient } from "@/components/hr/settings/profile/profile-client";
import type { Locale } from "@/lib/i18n/types";
import type { CompanyRole } from "@/types";

export default async function ProfileSettingsPage() {
  const user = await requireUser();
  const locale = await getLocale();
  const admin = createAdminClient();

  const [{ data: profile }, { data: roles }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, avatar_url, locale, email, current_company_id")
      .eq("id", user.id)
      .single(),
    admin
      .from("company_members")
      .select("company_id, role")
      .eq("user_id", user.id),
  ]);

  const currentMembership = (roles ?? []).find(
    (m) => m.company_id === profile?.current_company_id,
  );

  let isSoleOwner = false;
  for (const membership of roles ?? []) {
    if (membership.role !== "owner") continue;
    const { count } = await admin
      .from("company_members")
      .select("user_id", { count: "exact", head: true })
      .eq("company_id", membership.company_id)
      .eq("role", "owner");
    if ((count ?? 0) <= 1) {
      isSoleOwner = true;
      break;
    }
  }

  const authProvider = user.app_metadata?.provider ?? "email";
  const passwordAuthEnabled = authProvider === "email";

  return (
    <section>
      <SettingsHeader
        title={t("hr.settings.profile.title", locale)}
        sub={t("hr.settings.profile.subtitle", locale)}
      />
      <ProfileClient
        user={{
          id: user.id,
          email: profile?.email ?? user.email ?? "",
          fullName: profile?.full_name ?? "",
          locale: (profile?.locale ?? "ru") as Locale,
          avatarUrl: profile?.avatar_url ?? null,
          role: (currentMembership?.role ?? "recruiter") as CompanyRole,
          isSoleOwner,
          passwordAuthEnabled,
          authProviderLabel: authProvider,
        }}
      />
    </section>
  );
}
