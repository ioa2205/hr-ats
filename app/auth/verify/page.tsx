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
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const locale = await getLocale();

  return (
    <AuthPanel
      eyebrow={t("auth.sign_up", locale)}
      title={t("auth.verify_title", locale)}
      subtitle={
        email
          ? t("auth.verify_body_with_email", locale, { email })
          : t("auth.verify_body_no_email", locale)
      }
    >
      <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)]">
          <Mail className="h-4 w-4 text-[var(--color-text-muted)]" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <p className="text-[13px] leading-[1.55] text-[var(--color-text-muted)]">
          {t("auth.verify_help", locale)}
        </p>
      </div>

      <ResendVerificationButton email={email} />

      <Link
        href="/auth/login"
        className="text-center text-[13px] font-medium text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline"
      >
        {t("auth.back_to_login", locale)}
      </Link>
    </AuthPanel>
  );
}
