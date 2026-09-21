import type { Metadata } from "next";
import Link from "next/link";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthDivider } from "@/components/auth/auth-banner";
import { Button } from "@/components/ui";
import { LoginForm } from "@/components/auth/login-form";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import { getLocale, t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Sign in · TezHR",
};

function safeNextPath(value: string | string[] | undefined): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const nextPath = safeNextPath(sp.next);
  const callbackError = typeof sp.error === "string" ? sp.error : undefined;
  const notice = typeof sp.notice === "string" ? sp.notice : undefined;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();

  if (user) {
    const isOperator = user.app_metadata?.is_operator === true;
    const continueHref = nextPath ?? (isOperator ? "/operator" : "/hr/dashboard");
    return (
      <AuthPanel
        eyebrow={t("auth.sign_in", locale)}
        title={t("auth.already_signed_in_title", locale)}
        subtitle={t("auth.already_signed_in_body", locale, { email: user.email ?? "" })}
      >
        <div className="flex flex-col gap-2">
          <Button asChild size="lg" fullWidth>
            <Link href={continueHref}>{t("auth.continue_to_app", locale)}</Link>
          </Button>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="lg" fullWidth>
              {t("auth.sign_out", locale)}
            </Button>
          </form>
        </div>
      </AuthPanel>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <AuthPanel
        eyebrow={t("landing.nav.signin", locale)}
        title={t("auth.sign_in", locale)}
        subtitle={t("auth.login_sub", locale)}
      >
        <OAuthButtons nextPath={nextPath ?? undefined} />
        <AuthDivider label={t("auth.or", locale)} />
        <LoginForm nextPath={nextPath ?? undefined} callbackError={callbackError} notice={notice} />
      </AuthPanel>

      <p className="text-center text-[13px] text-[var(--color-text-muted)]">
        {t("auth.no_account", locale)}
        <Link
          href={nextPath === "/upgrade" ? "/auth/signup?intent=pro" : "/auth/signup"}
          className="ml-1.5 font-semibold text-[var(--color-text)] underline-offset-2 hover:text-[var(--color-primary)] hover:underline"
        >
          {t("auth.create_account", locale)}
        </Link>
      </p>
    </div>
  );
}
