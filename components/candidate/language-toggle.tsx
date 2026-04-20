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
      className="border-rule bg-paper flex gap-0.5 rounded-[4px] border p-0.5"
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
              "text-mono rounded-[3px] px-2 py-[3px] text-[10.5px] font-semibold tracking-[0.04em] transition-colors disabled:cursor-wait",
              active
                ? "bg-ink text-paper"
                : "text-ink-4 hover:bg-bone-2 hover:text-ink",
            )}
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
