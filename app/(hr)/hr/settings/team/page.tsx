export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getLocale, t } from "@/lib/i18n";
import { env } from "@/lib/env";
import { SettingsHeader } from "@/components/hr/design";
import {
  TeamClient,
  type TeamMemberRow,
  type PendingInviteRow,
} from "@/components/hr/settings/team/team-client";
import type { CompanyRole } from "@/types";

export default async function TeamSettingsPage() {
  const { user, companyId, role } = await requireCompanyAccess();
  const locale = await getLocale();
  const admin = createAdminClient();

  const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
    admin
      .from("company_members")
      .select("user_id, role, joined_at, profiles!inner(full_name, email, avatar_url)")
      .eq("company_id", companyId)
      .order("joined_at", { ascending: true }),
    admin
      .from("company_invites")
      .select(
        "id, email, role, token, expires_at, invited_by, profiles!company_invites_invited_by_fkey(full_name)",
      )
      .eq("company_id", companyId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  const userIds = (memberRows ?? []).map((r) => r.user_id);
  const lastSignInMap = new Map<string, string | null>();
  if (userIds.length > 0) {
    const { data: usersPage } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: Math.min(userIds.length, 1000),
    });
    for (const u of usersPage?.users ?? []) {
      if (userIds.includes(u.id)) lastSignInMap.set(u.id, u.last_sign_in_at ?? null);
    }
  }

  const members: TeamMemberRow[] = (memberRows ?? []).map((m) => {
    const p = m.profiles as unknown as {
      full_name: string;
      email: string;
      avatar_url: string | null;
    };
    return {
      userId: m.user_id,
      fullName: p.full_name,
      email: p.email,
      avatarUrl: p.avatar_url,
      role: m.role as CompanyRole,
      joinedAt: m.joined_at,
      lastSignInAt: lastSignInMap.get(m.user_id) ?? null,
    };
  });

  const invites: PendingInviteRow[] = (inviteRows ?? []).map((inv) => {
    const inviter = inv.profiles as unknown as { full_name: string } | null;
    return {
      id: inv.id,
      email: inv.email,
      role: inv.role as CompanyRole,
      token: inv.token,
      expiresAt: inv.expires_at,
      invitedByName: inviter?.full_name ?? "—",
      inviteUrl: `${env.APP_URL}/auth/accept-invite/${inv.token}`,
    };
  });

  return (
    <section>
      <SettingsHeader
        title={t("hr.settings.team.title", locale)}
        sub={t("hr.settings.team.subtitle", locale)}
      />
      <TeamClient
        selfId={user.id}
        selfRole={role as CompanyRole}
        members={members}
        invites={invites}
      />
    </section>
  );
}
