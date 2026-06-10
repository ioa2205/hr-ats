"use client";

import { Moon, Sun } from "lucide-react";
import { useHRChrome } from "./hr-chrome-context";
import { useTranslation } from "@/lib/i18n/provider";

export function HRThemeToggle() {
  const { theme, setTheme } = useHRChrome();
  const { t } = useTranslation();
  const next = theme === "dark" ? "light" : "dark";
  const label =
    theme === "dark" ? t("operator.chrome.theme_light") : t("operator.chrome.theme_dark");

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="flex h-9 w-9 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]"
      aria-label={label}
      title={label}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
