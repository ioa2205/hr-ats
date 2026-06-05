import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale, t } from "@/lib/i18n";
import { AuthPanel } from "@/components/auth/auth-panel";
import {
  OnboardingDecision,
  type OnboardingLabels,
} from "@/components/onboarding/onboarding-decision";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const sp = await searchParams;
  const intent = sp.intent === "pro" ? "pro" : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("current_company_id")
    .eq("id", user.id)
    .single();

  if (profile?.current_company_id) {
    redirect(intent === "pro" ? "/hr/settings/billing?intent=pro" : "/hr/dashboard");
  }

  const locale = await getLocale();

  const labels: OnboardingLabels = {
    create_company: t("onboarding.create_company", locale),
    create_company_desc: t("onboarding.create_company_desc", locale),
    join_company: t("onboarding.join_company", locale),
    join_company_desc: t("onboarding.join_company_desc", locale),
    invite_token: t("onboarding.invite_token", locale),
    invite_token_hint: t("onboarding.invite_token_hint", locale),
    join: t("onboarding.join", locale),
    joining: t("onboarding.joining", locale),
    or: t("onboarding.or", locale),
    error_invite_invalid: t("onboarding.error_invite_invalid", locale),
    error_invite_expired: t("onboarding.error_invite_expired", locale),
    error_invite_used: t("onboarding.error_invite_used", locale),
    error_already_member: t("onboarding.error_already_member", locale),
    error_accept_failed: t("onboarding.error_accept_failed", locale),
  };

  return (
    <AuthPanel
      eyebrow={t("onboarding.welcome_eyebrow", locale)}
      title={t("onboarding.title", locale)}
      subtitle={t("onboarding.subtitle", locale)}
    >
      <OnboardingDecision labels={labels} intent={intent} />
    </AuthPanel>
  );
}
