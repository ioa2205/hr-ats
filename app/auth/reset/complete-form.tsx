"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthField } from "@/components/auth/auth-field";
import { AuthBanner } from "@/components/auth/auth-banner";
import { completePasswordReset, type AuthState } from "@/lib/actions/auth";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

const errorMessageKeys: Record<string, TranslationKey> = {
  invalid_password: "auth.reset_invalid_password",
  reset_failed: "auth.reset_failed_desc",
};

export function CompleteResetForm() {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    completePasswordReset,
    null,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <AuthBanner tone="error">
          {errorMessageKeys[state.error]
            ? t(errorMessageKeys[state.error])
            : t("auth.reset_generic_failed")}
        </AuthBanner>
      )}

      <AuthField
        label={t("auth.reset_new_password_label")}
        name="password"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        helper={t("auth.password_hint")}
      />

      <Button type="submit" size="lg" fullWidth disabled={isPending} className="mt-1">
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        )}
        {t("auth.reset_update_button")}
      </Button>
    </form>
  );
}
