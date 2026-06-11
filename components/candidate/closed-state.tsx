import { Lock } from "lucide-react";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import { t } from "@/lib/i18n";
import { Card } from "@/components/ui";

interface ClosedStateProps {
  locale: Locale;
}

export async function ClosedState({ locale }: ClosedStateProps) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-4 px-6 py-14 text-center sm:py-16">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface-subtle)]">
          <Lock className="h-6 w-6 text-[var(--color-text-muted)]" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-[24px] leading-[1.2] font-bold tracking-[-0.02em] text-[var(--color-text)] sm:text-[28px]">
            {t("apply.closed_heading" as TranslationKey, locale)}
          </h1>
          <p className="mx-auto max-w-sm text-[14.5px] leading-[1.6] text-[var(--color-text-muted)]">
            {t("apply.closed_body" as TranslationKey, locale)}
          </p>
        </div>
      </div>
    </Card>
  );
}
