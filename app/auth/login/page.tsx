import type { Metadata } from "next";
import Link from "next/link";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthDivider } from "@/components/auth/auth-banner";
import { TezButton } from "@/components/hr/design";
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
          <Link href={continueHref} className="block">
            <TezButton
              variant="primary"
              size="lg"
              className="h-12 w-full justify-center text-[14.5px] font-semibold"
            >
              {t("auth.continue_to_app", locale)}
            </TezButton>
          </Link>
          <form action={signOut}>
            <TezButton
              type="submit"
              variant="ghost"
              size="lg"
              className="h-11 w-full justify-center text-[13.5px]"
            >
              {t("auth.sign_out", locale)}
            </TezButton>
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
        <OAuthButtons />
        <AuthDivider label={t("auth.or", locale)} />
        <LoginForm nextPath={nextPath ?? undefined} />
      </AuthPanel>

      <p className="text-ink-4 text-center text-[13px]">
        {t("auth.no_account", locale)}
        <Link
          href={nextPath === "/upgrade" ? "/auth/signup?intent=pro" : "/auth/signup"}
          className="text-ink hover:text-persimmon ml-1.5 font-semibold underline-offset-2 hover:underline"
        >
          {t("auth.create_account", locale)}
        </Link>
      </p>
    </div>
  );
}
