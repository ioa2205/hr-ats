"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/i18n/actions";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const locales: { value: Locale; label: string }[] = [
  { value: "ru", label: "RU" },
  { value: "uz", label: "UZ" },
  { value: "en", label: "EN" },
];

interface LanguageToggleProps {
  currentLocale?: Locale;
}

export function LanguageToggle({ currentLocale = "ru" }: LanguageToggleProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(locale: Locale) {
    if (locale === currentLocale) return;
    startTransition(async () => {
      await setLocale(locale);
      router.refresh();
    });
  }

  return (
    <div
      className="flex gap-0.5 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] p-0.5"
      role="group"
      aria-label="Language"
    >
      {locales.map((l) => {
        const active = currentLocale === l.value;
        return (
          <button
            key={l.value}
            type="button"
            onClick={() => handleChange(l.value)}
            disabled={isPending}
            aria-pressed={active}
            className={cn(
              "data-mono inline-flex h-8 min-w-[34px] items-center justify-center rounded-[4px] px-2 text-[11px] font-semibold tracking-[0.04em] transition-colors disabled:cursor-wait",
              active
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]",
            )}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
