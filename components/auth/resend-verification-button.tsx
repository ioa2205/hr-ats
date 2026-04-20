"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { TezButton } from "@/components/hr/design";
import { AuthBanner } from "@/components/auth/auth-banner";
import { resendVerification, type AuthState } from "@/lib/actions/auth";
import { useTranslation } from "@/lib/i18n/provider";

const COOLDOWN_SECONDS = 60;

interface ResendVerificationButtonProps {
  email?: string;
}

export function ResendVerificationButton({ email }: ResendVerificationButtonProps) {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    resendVerification,
    null,
  );
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (state?.ok) {
      setCooldown(COOLDOWN_SECONDS);
    }
  }, [state]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const disabled = !email || isPending || cooldown > 0;

  if (!email) return null;

  const bannerNode = (() => {
    if (state?.ok) {
      return (
        <AuthBanner tone="success" icon={<Check className="h-4 w-4" strokeWidth={2.5} />}>
          {t("auth.verify_resend_sent")}
        </AuthBanner>
      );
    }
    if (state?.error === "cooldown") {
      return (
        <AuthBanner tone="info">
          {t("auth.verify_resend_cooldown", { seconds: "60" })}
        </AuthBanner>
      );
    }
    if (state?.error === "rate_limit") {
      return <AuthBanner tone="error">{t("auth.verify_resend_rate_limit")}</AuthBanner>;
    }
    if (state?.error) {
      return <AuthBanner tone="error">{t("auth.verify_resend_error")}</AuthBanner>;
    }
    return null;
  })();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      {bannerNode}
      <TezButton
        type="submit"
        variant="secondary"
        size="md"
        disabled={disabled}
        className="h-10 justify-center text-[13.5px] font-medium"
        leadingIcon={
          isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
          )
        }
      >
        {isPending
          ? t("auth.verify_resend_sending")
          : cooldown > 0
            ? t("auth.verify_resend_cooldown", { seconds: String(cooldown) })
            : t("auth.verify_resend_button")}
      </TezButton>
    </form>
  );
}
