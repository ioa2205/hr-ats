"use client";

import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/provider";
import { SuccessState } from "@/components/candidate/success-state";

/**
 * Client wrapper so the server-rendered harness can preview the success state.
 * `SuccessState` takes a `t` callback (supplied by the client ApplyForm in
 * production); a Server Component cannot pass a function prop, so we build it
 * from the provider context here.
 */
export function SuccessPreview({ locale }: { locale: Locale }) {
  const { t } = useTranslation();
  return <SuccessState locale={locale} t={t} />;
}
