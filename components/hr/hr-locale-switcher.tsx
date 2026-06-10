"use client";

import { Check, Globe } from "lucide-react";
import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui";
import { setLocale } from "@/lib/i18n/actions";
import { useTranslation } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/types";

const LOCALES: Array<{ code: Locale; label: string }> = [
  { code: "ru", label: "RU" },
  { code: "uz", label: "UZ" },
  { code: "en", label: "EN" },
];

export function HRLocaleSwitcher() {
  const { locale, t } = useTranslation();
  const [pending, startTransition] = useTransition();

  function pick(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      window.location.reload();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 text-[12px] font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]"
          aria-label={t("operator.chrome.locale")}
        >
          <Globe className="h-4 w-4" />
          <span className="font-[var(--font-mono)]">{locale.toUpperCase()}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l.code} onSelect={() => pick(l.code)}>
            <span className="flex w-full items-center justify-between gap-3">
              <span className="font-[var(--font-tez-mono)]">{l.label}</span>
              {l.code === locale && <Check className="h-3.5 w-3.5" />}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
