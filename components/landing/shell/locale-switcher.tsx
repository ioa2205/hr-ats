"use client";

import { LocaleToggle, useLocaleChanger } from "../shared";

export function LocaleSwitcher({ size = "md" }: { size?: "sm" | "md" }) {
  const { locale, onChange } = useLocaleChanger();
  return <LocaleToggle current={locale} onChange={onChange} size={size} />;
}
