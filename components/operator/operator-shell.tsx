"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  OperatorChromeProvider,
  type OperatorChromeValue,
  type Theme,
} from "./operator-chrome-context";
import { CommandPalette } from "./command-palette";
import { ShortcutsCheatsheet } from "./shortcuts-cheatsheet";
import { OperatorSidebar } from "./sidebar";
import { OperatorTopBar } from "./top-bar";
import {
  initialChordState,
  isEditableTarget,
  matchShortcut,
  type ChordState,
} from "@/lib/operator/shortcuts";
import {
  getThemeServerSnapshot,
  getThemeSnapshot,
  subscribeTheme,
  writeTheme,
} from "@/lib/operator/theme-store";

interface Props {
  email: string;
  fullName: string | null;
  children: ReactNode;
}

export function OperatorShell({ email, fullName, children }: Props) {
  const router = useRouter();
  const theme = useSyncExternalStore<Theme>(
    subscribeTheme,
    getThemeSnapshot,
    getThemeServerSnapshot,
  );
  const setTheme = useCallback((t: Theme) => writeTheme(t), []);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);
  const chordRef = useRef<ChordState>(initialChordState());

  // Mirror the theme to <html data-operator-theme> so Radix portals (Dialog,
  // DropdownMenu, Tooltip) — which render outside the `.tezhr` subtree — pick
  // up the flipped tokens. Attribute is cleaned up on unmount so leaving the
  // operator route restores light mode everywhere else.
  useEffect(() => {
    document.documentElement.setAttribute("data-operator-theme", theme);
    return () => {
      document.documentElement.removeAttribute("data-operator-theme");
    };
  }, [theme]);

  // Global keyboard shortcut dispatch
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const result = matchShortcut(
        chordRef.current,
        {
          key: e.key,
          metaKey: e.metaKey,
          ctrlKey: e.ctrlKey,
          shiftKey: e.shiftKey,
          altKey: e.altKey,
          inEditable: isEditableTarget(e.target),
        },
        Date.now(),
      );
      chordRef.current = result.nextChord;
      if (!result.matched) return;

      e.preventDefault();
      switch (result.matched.action.kind) {
        case "open-palette":
          setPaletteOpen(true);
          setCheatsheetOpen(false);
          break;
        case "toggle-cheatsheet":
          setCheatsheetOpen((v) => !v);
          break;
        case "navigate":
          setPaletteOpen(false);
          setCheatsheetOpen(false);
          router.push(result.matched.action.href);
          break;
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [router]);

  const value: OperatorChromeValue = {
    theme,
    setTheme,
    paletteOpen,
    setPaletteOpen,
    cheatsheetOpen,
    setCheatsheetOpen,
  };

  return (
    <OperatorChromeProvider value={value}>
      <div
        suppressHydrationWarning
        data-theme={theme}
        className={`operator-shell-root tezhr ${theme === "dark" ? "dark" : ""} block min-h-screen bg-[var(--color-canvas)] text-[var(--color-text)] md:flex`}
      >
        <OperatorSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <OperatorTopBar email={email} fullName={fullName} />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">{children}</div>
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ShortcutsCheatsheet open={cheatsheetOpen} onOpenChange={setCheatsheetOpen} />
    </OperatorChromeProvider>
  );
}
