"use client";

import { useActionState, useEffect, useState } from "react";
import { Check, Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";
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
  const [now, setNow] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const cooldown = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  useEffect(() => {
    if (cooldownUntil <= now) return;
    const id = window.setTimeout(() => setNow(Date.now()), 1000);
    return () => window.clearTimeout(id);
  }, [cooldownUntil, now]);

  function handleSubmit(formData: FormData) {
    const startedAt = Date.now();
    setNow(startedAt);
    setCooldownUntil(startedAt + COOLDOWN_SECONDS * 1000);
    formAction(formData);
  }

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
        <AuthBanner tone="info">{t("auth.verify_resend_cooldown", { seconds: "60" })}</AuthBanner>
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
    <form action={handleSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      {bannerNode}
      <Button type="submit" variant="secondary" fullWidth disabled={disabled}>
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <RotateCcw className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
        )}
        {isPending
          ? t("auth.verify_resend_sending")
          : cooldown > 0
            ? t("auth.verify_resend_cooldown", { seconds: String(cooldown) })
            : t("auth.verify_resend_button")}
      </Button>
    </form>
  );
}
