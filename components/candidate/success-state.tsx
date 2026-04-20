"use client";

import { Check } from "lucide-react";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import { Panel } from "@/components/hr/design";

interface SuccessStateProps {
  locale: Locale;
  t: (key: TranslationKey) => string;
}

export function SuccessState({ t }: SuccessStateProps) {
  return (
    <Panel>
      <div className="flex flex-col items-center gap-5 px-6 py-14 text-center sm:py-20">
        <div
          className="bg-persimmon-tint flex h-16 w-16 items-center justify-center rounded-full"
          style={{ animation: "pop 280ms cubic-bezier(0.2, 0, 0, 1.4)" }}
        >
          <Check className="text-persimmon-2 h-8 w-8" strokeWidth={2.5} />
        </div>

        <div
          className="space-y-2"
          style={{ animation: "fadeInUp 320ms ease-out 120ms both" }}
        >
          <h2 className="text-ink text-[24px] font-bold leading-[1.2] tracking-[-0.02em] sm:text-[28px]">
            {t("apply.success_heading")}
          </h2>
          <p className="text-ink-3 mx-auto max-w-sm text-[14.5px] leading-[1.6]">
            {t("apply.success_body")}
          </p>
        </div>

        <style jsx>{`
          @keyframes pop {
            0% {
              transform: scale(0.6);
              opacity: 0;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    </Panel>
  );
}
