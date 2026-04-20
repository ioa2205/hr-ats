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
      className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-[var(--color-rule)] bg-[var(--color-bone)]/90 px-4 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        data-testid="open-palette"
        className="flex h-8 max-w-md flex-1 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] px-3 text-left text-[12px] text-[var(--color-ink-4)] hover:border-[var(--color-ink-5)]"
        aria-label={t("operator.palette.title")}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 truncate">{t("operator.chrome.search_placeholder")}</span>
        <kbd className="font-[var(--font-tez-mono)] rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-bone)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--color-ink-3)]">
          {mac ? "⌘K" : "Ctrl+K"}
        </kbd>
      </button>

      <div className="hidden flex-1 md:block" aria-hidden="true" />

      <div className="flex items-center gap-2">
        <PlatformPulsePill />
        <span className="h-4 w-px bg-[var(--color-rule-2)]" aria-hidden="true" />
        <LocaleSwitcher />
        <ThemeToggle />
        <OperatorAvatarMenu email={email} fullName={fullName} />
      </div>
    </header>
  );
}
