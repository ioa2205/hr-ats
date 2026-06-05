"use client";

import { createContext, useContext } from "react";

export type Theme = "light" | "dark";

export interface HRChromeValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
}

const HRChromeContext = createContext<HRChromeValue | null>(null);

export function useHRChrome(): HRChromeValue {
  const ctx = useContext(HRChromeContext);
  if (!ctx) throw new Error("useHRChrome must be used inside HRShell");
  return ctx;
}

export const HRChromeProvider = HRChromeContext.Provider;
