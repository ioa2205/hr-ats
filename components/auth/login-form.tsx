"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthField } from "./auth-field";
import { AuthBanner } from "./auth-banner";
import { signInWithEmail, type AuthState } from "@/lib/actions/auth";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

const errorKeys: Record<string, TranslationKey> = {
  invalid_credentials: "auth.invalid_credentials",
  email_not_verified: "auth.email_not_verified",
};

const callbackErrors = new Set([
  "oauth_failed",
  "verification_failed",
  "missing_code",
  "exchange_failed",
]);

interface LoginFormProps {
  nextPath?: string;
  callbackError?: string;
  notice?: string;
}

export function LoginForm({ nextPath, callbackError, notice }: LoginFormProps) {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(signInWithEmail, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {notice === "account_created" && (
        <AuthBanner tone="success" icon={<Check className="h-4 w-4" strokeWidth={2.5} />}>
          {t("auth.account_created_notice")}
        </AuthBanner>
      )}
      {callbackError && callbackErrors.has(callbackError) && (
        <AuthBanner tone="error">{t("auth.callback_failed")}</AuthBanner>
      )}
      {state?.error && (
        <div className="flex flex-col gap-2.5">
          <AuthBanner tone="error">
            {errorKeys[state.error] ? t(errorKeys[state.error]) : t("auth.invalid_credentials")}
          </AuthBanner>
          {state.error === "email_not_verified" && state.email && (
            <Link
              href={`/auth/verify?${new URLSearchParams({ email: state.email, next: nextPath ?? "/onboarding" }).toString()}`}
              className="text-[13px] font-semibold text-[var(--color-on-primary-container)] underline-offset-2 hover:underline"
            >
              {t("auth.verify_email_action")}
            </Link>
          )}
        </div>
      )}

      <AuthField
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />

      {nextPath && <input type="hidden" name="next" value={nextPath} />}

      <AuthField
        label={t("auth.password")}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        endSlot={
          <Link
            href="/auth/reset"
            className="rounded-[var(--radius-sm)] text-[12px] font-medium text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline"
          >
            {t("auth.forgot_password")}
          </Link>
        }
      />

      <Button type="submit" size="lg" fullWidth disabled={isPending} className="mt-1">
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        )}
        {t("auth.sign_in")}
      </Button>
    </form>
  );
}
