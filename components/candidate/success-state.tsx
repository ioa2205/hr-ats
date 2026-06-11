"use client";

import { Check } from "lucide-react";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import { Card } from "@/components/ui";

interface SuccessStateProps {
  locale: Locale;
  t: (key: TranslationKey) => string;
}

export function SuccessState({ t }: SuccessStateProps) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-5 px-6 py-14 text-center sm:py-16">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-success-container)]"
          style={{ animation: "pop 280ms cubic-bezier(0.2, 0, 0, 1.4)" }}
        >
          <Check className="h-8 w-8 text-[var(--color-success)]" strokeWidth={2.5} />
        </div>

        <div className="space-y-2" style={{ animation: "fadeInUp 320ms ease-out 120ms both" }}>
          <h2 className="text-[24px] leading-[1.2] font-bold tracking-[-0.02em] text-[var(--color-text)] sm:text-[28px]">
            {t("apply.success_heading")}
          </h2>
          <p className="mx-auto max-w-sm text-[14.5px] leading-[1.6] text-[var(--color-text-muted)]">
            {t("apply.success_body")}
          </p>
        </div>

        <div
          className="w-full max-w-sm rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-4 py-3 text-left"
          style={{ animation: "fadeInUp 320ms ease-out 180ms both" }}
        >
          <p className="data-mono text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
            {t("apply.next_step_label")}
          </p>
          <p className="mt-1 text-[13.5px] leading-[1.55] text-[var(--color-text-muted)]">
            {t("apply.next_step_body")}
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
          @media (prefers-reduced-motion: reduce) {
            div {
              animation: none !important;
            }
          }
        `}</style>
      </div>
    </Card>
  );
}
