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
      <div className="border-rule bg-bone-2/60 flex items-start gap-3 rounded-[6px] border px-4 py-3">
        <span className="bg-paper border-rule flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] border">
          <Mail className="text-ink-3 h-4 w-4" strokeWidth={1.75} />
        </span>
        <p className="text-ink-3 text-[13px] leading-[1.55]">{t("auth.verify_help", locale)}</p>
      </div>

      <ResendVerificationButton email={email} />

      <Link
        href="/auth/login"
        className="text-ink-4 hover:text-ink text-center text-[13px] font-medium underline-offset-2 hover:underline"
      >
        {t("auth.back_to_login", locale)}
      </Link>
    </AuthPanel>
  );
}
