import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";
import { PhoneOtpForm } from "@/components/auth/phone-otp-form";
import { getLocale, t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Sign up with phone · TezHR",
};

export default async function SignupPhonePage() {
  const locale = await getLocale();
  return (
    <AuthPanel
      eyebrow={t("landing.meta.free_trial_badge", locale)}
      title={t("auth.phone_signup_title", locale)}
      subtitle={t("auth.phone_signup_desc", locale)}
    >
      <PhoneOtpForm />
    </AuthPanel>
  );
}
