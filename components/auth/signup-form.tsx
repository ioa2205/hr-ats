"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { TezButton } from "@/components/hr/design";
import { AuthField } from "./auth-field";
import { AuthBanner } from "./auth-banner";
import { signUpWithEmail, type AuthState } from "@/lib/actions/auth";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

const errorMessageKeys: Record<string, TranslationKey> = {
  invalid_input: "auth.signup_invalid_input",
  email_taken: "auth.signup_email_taken",
  signup_failed: "auth.signup_generic_failed",
};

interface SignupFormProps {
  pinnedEmail?: string;
  inviteToken?: string;
  intent?: "pro";
}

export function SignupForm({ pinnedEmail, inviteToken, intent }: SignupFormProps = {}) {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(signUpWithEmail, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <AuthBanner tone="error">
          {errorMessageKeys[state.error]
            ? t(errorMessageKeys[state.error])
            : t("auth.signup_generic_failed")}
        </AuthBanner>
      )}

      {inviteToken && <input type="hidden" name="invite" value={inviteToken} />}
      {intent && <input type="hidden" name="intent" value={intent} />}

      <AuthField
        label={t("auth.full_name")}
        name="full_name"
        type="text"
        autoComplete="name"
        required
        minLength={2}
        maxLength={120}
        placeholder="Jane Doe"
      />

      <AuthField
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        defaultValue={pinnedEmail}
        readOnly={Boolean(pinnedEmail)}
        helper={pinnedEmail ? t("auth.email_locked") : undefined}
        placeholder="you@example.com"
      />

      <AuthField
        label={t("auth.password")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        helper={t("auth.password_hint")}
      />

      <TezButton
        type="submit"
        variant="primary"
        size="lg"
        disabled={isPending}
        className="mt-1 h-12 w-full justify-center text-[14.5px] font-semibold"
        leadingIcon={isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
      >
        {t("auth.create_account")}
      </TezButton>
    </form>
  );
}
