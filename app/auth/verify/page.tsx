import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthPanel } from "@/components/auth/auth-panel";
import { ResendVerificationButton } from "@/components/auth/resend-verification-button";
import { getLocale, t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Verify your email · TezHR",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email, next } = await searchParams;
  const locale = await getLocale();
  const nextPath = next?.startsWith("/") && !next.startsWith("//") ? next : "/onboarding";

  return (
    <AuthPanel
      title={t("auth.verify_title", locale)}
      subtitle={
        email
          ? t("auth.verify_body_with_email", locale, { email })
          : t("auth.verify_body_no_email", locale)
      }
    >
      <div className="flex items-start gap-3 rounded-[12px] bg-[var(--color-surface-subtle)] px-4 py-4">
        <Mail
          className="mt-0.5 h-5 w-5 shrink-0 text-[var(--color-text-muted)]"
          strokeWidth={1.75}
          aria-hidden="true"
        />
        <p className="text-[13px] leading-[1.55] text-[var(--color-text-muted)]">
          {t("auth.verify_help", locale)}
        </p>
      </div>

      <ResendVerificationButton email={email} nextPath={nextPath} />

      <Link
        href={`/auth/login?next=${encodeURIComponent(nextPath)}`}
        className="text-center text-[13px] font-medium text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline"
      >
        {t("auth.back_to_login", locale)}
      </Link>
    </AuthPanel>
  );
}
