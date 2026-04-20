import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLocale, t } from "@/lib/i18n";
import { AuthPanel } from "@/components/auth/auth-panel";
import {
  CreateCompanyForm,
  type CreateCompanyLabels,
} from "@/components/onboarding/create-company-form";

export default async function OnboardingCreatePage() {
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
    redirect("/hr/dashboard");
  }

  const locale = await getLocale();

  const labels: CreateCompanyLabels = {
    company_name: t("onboarding.company_name", locale),
    company_name_hint: t("onboarding.company_name_hint", locale),
    default_locale: t("onboarding.default_locale", locale),
    default_locale_hint: t("onboarding.default_locale_hint", locale),
    creating: t("onboarding.creating", locale),
    create: t("onboarding.create", locale),
    back: t("onboarding.back", locale),
    error_slug_taken: t("onboarding.error_slug_taken", locale),
    error_create_failed: t("onboarding.error_create_failed", locale),
    locale_ru: t("onboarding.locale_ru", locale),
    locale_uz: t("onboarding.locale_uz", locale),
    locale_en: t("onboarding.locale_en", locale),
  };

  return (
    <AuthPanel
      eyebrow={t("onboarding.create_company", locale)}
      title={t("onboarding.create_title", locale)}
      subtitle={t("onboarding.create_subtitle", locale)}
    >
      <CreateCompanyForm labels={labels} />
    </AuthPanel>
  );
}
