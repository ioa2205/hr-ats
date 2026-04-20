import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AuthPanel } from "@/components/auth/auth-panel";
import { RequestResetForm } from "./request-form";
import { CompleteResetForm } from "./complete-form";
import { getLocale, t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Reset password · TezHR",
};

export default async function ResetPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const hasRecoverySession = Boolean(user);

  return (
    <AuthPanel
      eyebrow={t("auth.sign_in", locale)}
      title={
        hasRecoverySession ? t("auth.reset_set_new_title", locale) : t("auth.reset_title", locale)
      }
      subtitle={
        hasRecoverySession ? t("auth.reset_set_new_desc", locale) : t("auth.reset_desc", locale)
      }
    >
      {hasRecoverySession ? <CompleteResetForm /> : <RequestResetForm />}
    </AuthPanel>
  );
}
