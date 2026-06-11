"use client";

import { Search } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useOperatorChrome } from "./operator-chrome-context";
import { PlatformPulsePill } from "./platform-pulse-pill";
import { LocaleSwitcher } from "./locale-switcher";
import { ThemeToggle } from "./theme-toggle";
import { OperatorAvatarMenu } from "./operator-avatar-menu";
import { useTranslation } from "@/lib/i18n/provider";
import {
  getIsMacServerSnapshot,
  getIsMacSnapshot,
  subscribePlatform,
} from "@/lib/operator/platform-store";

interface Props {
  email: string;
  fullName: string | null;
}

export function OperatorTopBar({ email, fullName }: Props) {
  const { setPaletteOpen } = useOperatorChrome();
  const { t } = useTranslation();
  const mac = useSyncExternalStore(subscribePlatform, getIsMacSnapshot, getIsMacServerSnapshot);

  return (
    <header
      data-testid="operator-top-bar"
      className="glass-bar sticky top-[var(--app-sticky-top)] z-30 flex h-12 items-center gap-3 border-b border-[var(--color-line)] px-4"
    >
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        data-testid="open-palette"
        className="signal-edge hidden h-8 max-w-md min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-left text-[12px] text-[var(--color-text-muted)] sm:flex"
        aria-label={t("operator.palette.title")}
      >
        <Search className="h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 truncate">{t("operator.chrome.search_placeholder")}</span>
        <kbd className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[10px] leading-none font-[var(--font-mono)] text-[var(--color-text-subtle)]">
          {mac ? "⌘K" : "Ctrl+K"}
        </kbd>
      </button>

      <div className="flex-1" aria-hidden="true" />

      <div className="flex items-center gap-2">
        <PlatformPulsePill />
        <span className="h-4 w-px bg-[var(--color-line)]" aria-hidden="true" />
        <LocaleSwitcher />
        <ThemeToggle />
        <OperatorAvatarMenu email={email} fullName={fullName} />
      </div>
    </header>
  );
}
