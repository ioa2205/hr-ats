"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import "./landing.css";
import { setLocale as setLocaleAction } from "@/lib/i18n/actions";
import { useTranslation } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/types";
import { LOGIN_HREF, SIGNUP_HREF, TELEGRAM_URL } from "./constants";

export { LOGIN_HREF, SIGNUP_HREF, TELEGRAM_URL };

const LOCALE_CODES: { code: Locale; label: string; name: string }[] = [
  { code: "ru", label: "RU", name: "Русский" },
  { code: "uz", label: "UZ", name: "O‘zbekcha" },
  { code: "en", label: "EN", name: "English" },
];

export function useLocaleChanger() {
  const router = useRouter();
  const { locale } = useTranslation();
  const [, startTransition] = useTransition();
  const onChange = (next: Locale) => {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };
  return { locale, onChange };
}

export function LocaleToggle({
  current,
  onChange,
  size = "md",
}: {
  current: Locale;
  onChange: (l: Locale) => void;
  size?: "sm" | "md";
}) {
  return (
    <div
      role="group"
      aria-label="Language"
      className={`craft-locale-switcher craft-locale-switcher-${size}`}
    >
      {LOCALE_CODES.map(({ code, label, name }) => {
        const selected = current === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={selected}
            aria-label={name}
            lang={code}
            title={name}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
