"use client";

import { createContext, useContext } from "react";

export type Theme = "light" | "dark";

export interface OperatorChromeValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  cheatsheetOpen: boolean;
  setCheatsheetOpen: (open: boolean) => void;
}

const OperatorChromeContext = createContext<OperatorChromeValue | null>(null);

export function useOperatorChrome(): OperatorChromeValue {
  const ctx = useContext(OperatorChromeContext);
  if (!ctx) throw new Error("useOperatorChrome must be used inside OperatorShell");
  return ctx;
}

export const OperatorChromeProvider = OperatorChromeContext.Provider;
