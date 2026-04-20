import { Lock } from "lucide-react";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import { t } from "@/lib/i18n";
import { Panel } from "@/components/hr/design";

interface ClosedStateProps {
  locale: Locale;
}

export async function ClosedState({ locale }: ClosedStateProps) {
  return (
    <Panel>
      <div className="flex flex-col items-center gap-4 px-6 py-14 text-center sm:py-20">
        <div className="bg-bone-2 border-rule flex h-14 w-14 items-center justify-center rounded-full border">
          <Lock className="text-ink-4 h-6 w-6" strokeWidth={1.5} />
        </div>
        <div className="space-y-2">
          <h1 className="text-ink text-[24px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[28px]">
            {t("apply.closed_heading" as TranslationKey, locale)}
          </h1>
          <p className="text-ink-3 mx-auto max-w-sm text-[14.5px] leading-[1.6]">
            {t("apply.closed_body" as TranslationKey, locale)}
          </p>
        </div>
      </div>
    </Panel>
  );
}
