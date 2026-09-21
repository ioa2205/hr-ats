import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";
import { PhoneOtpForm } from "@/components/auth/phone-otp-form";
import { getLocale, t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Sign up with phone · TezHR",
};

function safeNextPath(value: string | string[] | undefined): string | undefined {
  if (typeof value !== "string") return undefined;
  if (!value.startsWith("/") || value.startsWith("//")) return undefined;
  return value;
}

export default async function SignupPhonePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const nextPath = safeNextPath(sp.next);
  const pinnedEmail = typeof sp.email === "string" ? sp.email : undefined;
  const locale = await getLocale();
  return (
    <AuthPanel
      eyebrow={t("landing.meta.free_trial_badge", locale)}
      title={t("auth.phone_signup_title", locale)}
      subtitle={t("auth.phone_signup_desc", locale)}
    >
      <PhoneOtpForm nextPath={nextPath} pinnedEmail={pinnedEmail} />
    </AuthPanel>
  );
}
