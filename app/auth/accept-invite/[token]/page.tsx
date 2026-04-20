export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AcceptInviteClient } from "./accept-invite-client";
import { getLocale, t } from "@/lib/i18n";

interface Props {
  params: Promise<{ token: string }>;
}

export default async function AcceptInvitePage({ params }: Props) {
  const { token } = await params;
  const admin = createAdminClient();
  const locale = await getLocale();

  // Look up the invite
  const { data: invite } = await admin
    .from("company_invites")
    .select("id, email, role, expires_at, accepted_at, company_id, companies(name)")
    .eq("token", token)
    .maybeSingle();

  if (!invite) {
    return (
      <AuthPanel
        eyebrow={<AlertCircle className="inline h-3 w-3" />}
        title={t("invite.invalid", locale)}
        subtitle={t("invite.invalid_desc", locale)}
      >
        <p className="text-ink-4 text-[13px]">{t("invite.error_generic", locale)}</p>
      </AuthPanel>
    );
  }

  if (invite.accepted_at) {
    return (
      <AuthPanel
        eyebrow={<CheckCircle2 className="inline h-3 w-3" />}
        title={t("invite.used", locale)}
        subtitle={t("invite.used_desc", locale)}
      >
        <p className="text-ink-4 text-[13px]">{t("invite.error_used", locale)}</p>
      </AuthPanel>
    );
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <AuthPanel
        eyebrow={<Clock className="inline h-3 w-3" />}
        title={t("invite.expired", locale)}
        subtitle={t("invite.expired_desc", locale)}
      >
        <p className="text-ink-4 text-[13px]">{t("invite.error_expired", locale)}</p>
      </AuthPanel>
    );
  }

  const company = invite.companies as unknown as { name: string };

  // Check if user is logged in
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/auth/signup?invite=${encodeURIComponent(token)}&email=${encodeURIComponent(invite.email)}`,
    );
  }

  // Check if already a member
  const { data: existingMember } = await admin
    .from("company_members")
    .select("user_id")
    .eq("company_id", invite.company_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMember) {
    redirect("/hr/dashboard");
  }

  return (
    <AcceptInviteClient
      token={token}
      companyName={company.name}
      role={invite.role}
      email={invite.email}
    />
  );
}
