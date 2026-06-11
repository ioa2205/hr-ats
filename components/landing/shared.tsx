"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import "./landing.css";
import { setLocale as setLocaleAction } from "@/lib/i18n/actions";
import { useTranslation } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/types";
import { LOGIN_HREF, SIGNUP_HREF, TELEGRAM_URL } from "./constants";

export { LOGIN_HREF, SIGNUP_HREF, TELEGRAM_URL };

const LOCALE_CODES: { code: Locale; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "uz", label: "UZ" },
  { code: "en", label: "EN" },
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
  const pad = size === "sm" ? "5px 9px" : "6px 11px";
  return (
    <div
      role="group"
      aria-label="Language"
      style={{
        display: "inline-flex",
        padding: 2,
        gap: 2,
        borderRadius: 999,
        border: "1px solid var(--rule)",
        background: "var(--paper-2)",
        fontFamily: "var(--font-jetbrains-mono),monospace",
        fontSize: 11,
        letterSpacing: "0.06em",
      }}
    >
      {LOCALE_CODES.map(({ code, label }) => {
        const selected = current === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => onChange(code)}
            aria-pressed={selected}
            style={{
              padding: pad,
              borderRadius: 999,
              background: selected ? "var(--ikat)" : "transparent",
              color: selected ? "var(--color-on-primary)" : "var(--ink-3)",
              border: 0,
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: selected ? 600 : 500,
              transition: "background-color 120ms, color 120ms",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
