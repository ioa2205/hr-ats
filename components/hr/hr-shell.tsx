"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { HRChromeProvider, type HRChromeValue, type Theme } from "./hr-chrome-context";
import { Sidebar } from "./sidebar";
import { HRTopBar } from "./top-bar";
import { HRMobileChrome, HRBottomNav } from "./mobile-nav";
import { HRCommandPalette } from "./command-palette";
import type { CompanyOption } from "./company-switcher";
import type { Locale } from "@/lib/i18n/types";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeTheme,
  writeTheme,
} from "@/lib/hr/theme-store";

interface Props {
  email: string;
  fullName: string | null;
  userId: string;
  locale: Locale;
  currentCompany: CompanyOption | undefined;
  companies: CompanyOption[] | undefined;
  quotaBanner: ReactNode;
  counts?: { jobs?: number; candidates?: number; newCandidates?: number };
  children: ReactNode;
}

export function HRShell({
  email,
  fullName,
  userId,
  locale,
  currentCompany,
  companies,
  quotaBanner,
  counts,
  children,
}: Props) {
  const theme = useSyncExternalStore<Theme>(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );
  const setTheme = useCallback((t: Theme) => writeTheme(t), []);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // Mirror the theme onto <html data-hr-theme> so Radix portals (Dialog,
  // DropdownMenu, Tooltip, Sheet) — which render outside the `.tezhr` subtree —
  // pick up the flipped tokens. The attribute is cleared on unmount so
  // leaving the HR route restores light mode for other surfaces.
  useEffect(() => {
    document.documentElement.setAttribute("data-hr-theme", theme);
    return () => {
      document.documentElement.removeAttribute("data-hr-theme");
    };
  }, [theme]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const value: HRChromeValue = { theme, setTheme, paletteOpen, setPaletteOpen };
  const notifications = currentCompany ? { companyId: currentCompany.id, userId } : null;

  return (
    <HRChromeProvider value={value}>
      <div
        suppressHydrationWarning
        data-theme={theme}
        className={`hr-shell-root tezhr ${theme === "dark" ? "dark" : ""} flex min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)]`}
      >
        <Sidebar
          locale={locale}
          currentCompany={currentCompany}
          companies={companies}
          quotaBanner={quotaBanner}
          counts={counts}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <HRTopBar email={email} fullName={fullName} notifications={notifications} />
          <HRMobileChrome
            email={email}
            fullName={fullName}
            notifications={notifications}
            currentCompany={currentCompany}
            companies={companies}
            quotaBanner={quotaBanner}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-[1280px] px-4 pt-5 pb-24 sm:px-6 md:pb-14 lg:px-7">
              {children}
            </div>
          </main>
        </div>
      </div>
      <HRBottomNav counts={counts} />
      <HRCommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </HRChromeProvider>
  );
}
