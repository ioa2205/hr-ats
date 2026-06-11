"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthField } from "./auth-field";
import { AuthBanner } from "./auth-banner";
import { signInWithEmail, type AuthState } from "@/lib/actions/auth";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

const errorKeys: Record<string, TranslationKey> = {
  invalid_credentials: "auth.invalid_credentials",
};

export function LoginForm({ nextPath }: { nextPath?: string }) {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(signInWithEmail, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && (
        <AuthBanner tone="error">
          {errorKeys[state.error] ? t(errorKeys[state.error]) : t("auth.invalid_credentials")}
        </AuthBanner>
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
