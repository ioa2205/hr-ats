"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthField } from "@/components/auth/auth-field";
import { AuthBanner } from "@/components/auth/auth-banner";
import { requestPasswordReset, type AuthState } from "@/lib/actions/auth";
import { useTranslation } from "@/lib/i18n/provider";

export function RequestResetForm() {
  const { t } = useTranslation();
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    requestPasswordReset,
    null,
  );

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-4">
        <AuthBanner tone="success" icon={<Check className="h-4 w-4" strokeWidth={2.5} />}>
          {t("auth.reset_sent_desc")}
        </AuthBanner>
        <Link
          href="/auth/login"
          className="text-center text-[13px] font-medium text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline"
        >
          {t("auth.back_to_login")}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.error && <AuthBanner tone="error">{t("auth.reset_invalid_email")}</AuthBanner>}

      <AuthField
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="you@example.com"
      />

      <Button type="submit" size="lg" fullWidth disabled={isPending} className="mt-1">
        {isPending && (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        )}
        {t("auth.reset_send_button")}
      </Button>

      <Link
        href="/auth/login"
        className="text-center text-[13px] font-medium text-[var(--color-text-muted)] underline-offset-2 hover:text-[var(--color-text)] hover:underline"
      >
        {t("auth.back_to_login")}
      </Link>
    </form>
  );
}
