"use client";

import { Search } from "lucide-react";
import { useHRChrome } from "./hr-chrome-context";
import { HRThemeToggle } from "./theme-toggle";
import { HRLocaleSwitcher } from "./hr-locale-switcher";
import { HRAvatarMenu } from "./hr-avatar-menu";
import { NotificationsBell } from "./notifications-bell";
import { useTranslation } from "@/lib/i18n/provider";

interface Props {
  email: string;
  fullName: string | null;
  notifications: { companyId: string; userId: string } | null;
}

export function HRTopBar({ email, fullName, notifications }: Props) {
  const { setPaletteOpen } = useHRChrome();
  const { t } = useTranslation();

  return (
    <header
      data-testid="hr-top-bar"
      className="sticky top-0 z-30 flex h-12 items-center gap-3 border-b border-[var(--color-rule)] bg-[var(--color-bone)]/90 px-4 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        data-testid="hr-open-palette"
        className="flex h-8 max-w-md flex-1 items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] px-3 text-left text-[12px] text-[var(--color-ink-4)] hover:border-[var(--color-ink-5)]"
        aria-label={t("hr.palette.title")}
      >
        <Search className="h-3.5 w-3.5" />
        <span className="flex-1 truncate">{t("hr.chrome.search_placeholder")}</span>
        <kbd className="rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-bone)] px-1.5 py-0.5 text-[10px] leading-none font-[var(--font-tez-mono)] text-[var(--color-ink-3)]">
          Ctrl K
        </kbd>
      </button>

      <div className="hidden flex-1 md:block" aria-hidden="true" />

      <div className="flex items-center gap-2">
        {notifications && (
          <>
            <NotificationsBell companyId={notifications.companyId} userId={notifications.userId} />
            <span className="h-4 w-px bg-[var(--color-rule-2)]" aria-hidden="true" />
          </>
        )}
        <HRLocaleSwitcher />
        <HRThemeToggle />
        <HRAvatarMenu email={email} fullName={fullName} />
      </div>
    </header>
  );
}
