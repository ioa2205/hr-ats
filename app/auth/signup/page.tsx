import type { Metadata } from "next";
import Link from "next/link";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthDivider } from "@/components/auth/auth-banner";
import { SignupForm } from "@/components/auth/signup-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { getLocale, t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Create account · TezHR",
};

interface SignupPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const sp = await searchParams;
  const rawEmail = typeof sp.email === "string" ? sp.email : undefined;
  const rawInvite = typeof sp.invite === "string" ? sp.invite : undefined;
  const rawIntent = sp.intent === "pro" ? "pro" : undefined;
  const locale = await getLocale();

  return (
    <div className="flex flex-col gap-4">
      <AuthPanel
        eyebrow={t("landing.meta.free_trial_badge", locale)}
        title={t("auth.create_account", locale)}
        subtitle={t("auth.signup_sub", locale)}
      >
        <OAuthButtons />
        <AuthDivider label={t("auth.or", locale)} />
        <SignupForm pinnedEmail={rawEmail} inviteToken={rawInvite} intent={rawIntent} />
      </AuthPanel>

      <p className="text-ink-4 text-center text-[13px]">
        {t("auth.already_have_account", locale)}
        <Link
          href={rawIntent === "pro" ? "/auth/login?next=/upgrade" : "/auth/login"}
          className="text-ink hover:text-persimmon ml-1.5 font-semibold underline-offset-2 hover:underline"
        >
          {t("auth.sign_in", locale)}
        </Link>
      </p>
    </div>
  );
}
