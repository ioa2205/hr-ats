"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import {
  getLandingThemeServerSnapshot,
  getLandingThemeSnapshot,
  subscribeLandingTheme,
  writeLandingTheme,
} from "@/lib/landing/theme-store";

/**
 * Light/dark toggle for the marketing surface. Applies `.theme-dark` to the
 * `.tezhr-landing` root only — the landing's local tokens map to the canonical
 * `--color-*` roles, which `.theme-dark` flips, so the whole page re-themes
 * without touching `<html>` (which would bleed into the app shells).
 */
export function LandingThemeToggle({ label }: { label: string }) {
  const theme = useSyncExternalStore(
    subscribeLandingTheme,
    getLandingThemeSnapshot,
    getLandingThemeServerSnapshot,
  );

  useEffect(() => {
    const root = document.querySelector(".tezhr-landing");
    root?.classList.toggle("theme-dark", theme === "dark");
    return () => {
      root?.classList.remove("theme-dark");
    };
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      data-testid="landing-theme-toggle"
      onClick={() => writeLandingTheme(isDark ? "light" : "dark")}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      className="grid h-10 w-10 place-items-center rounded-lg border transition-colors"
      style={{ borderColor: "var(--rule)", color: "var(--ink-3)" }}
    >
      {isDark ? (
        <Sun className="h-[18px] w-[18px]" aria-hidden />
      ) : (
        <Moon className="h-[18px] w-[18px]" aria-hidden />
      )}
    </button>
  );
}
