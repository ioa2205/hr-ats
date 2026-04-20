"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import type { Locale, TranslationKey } from "./types";

interface TranslationsContextValue {
  locale: Locale;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
}

const TranslationsContext = createContext<TranslationsContextValue | null>(null);

export function useTranslation(): TranslationsContextValue {
  const ctx = useContext(TranslationsContext);
  if (!ctx) throw new Error("useTranslation must be used within TranslationsProvider");
  return ctx;
}

export function TranslationsProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Record<TranslationKey, string>;
  children: ReactNode;
}) {
  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string>): string => {
      let value = messages[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), v);
        }
      }
      return value;
    },
    [messages],
  );

  const value = useMemo(() => ({ locale, t }), [locale, t]);

  return <TranslationsContext.Provider value={value}>{children}</TranslationsContext.Provider>;
}
