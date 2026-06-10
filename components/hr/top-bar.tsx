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

/**
 * Desktop HR top bar. Global search stays prominent but not dominant (a
 * constrained palette trigger), with notifications, locale, theme, and profile
 * in a predictable cluster on the right. Hidden under `md` — the mobile chrome
 * owns small screens.
 */
export function HRTopBar({ email, fullName, notifications }: Props) {
  const { setPaletteOpen } = useHRChrome();
  const { t } = useTranslation();

  return (
    <header
      data-testid="hr-top-bar"
      className="sticky top-[var(--app-sticky-top)] z-30 hidden h-14 items-center gap-3 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-canvas)_88%,transparent)] px-6 backdrop-blur-sm md:flex"
    >
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        data-testid="hr-open-palette"
        className="flex h-9 w-full max-w-sm items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3 text-left text-[13px] text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-line-strong)]"
        aria-label={t("hr.palette.title")}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{t("hr.chrome.search_placeholder")}</span>
        <kbd className="rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[10px] leading-none font-[var(--font-mono)] text-[var(--color-text-subtle)]">
          Ctrl K
        </kbd>
      </button>

      <div className="flex-1" aria-hidden="true" />

      <div className="flex items-center gap-2">
        {notifications && (
          <>
            <NotificationsBell companyId={notifications.companyId} userId={notifications.userId} />
            <span className="h-5 w-px bg-[var(--color-line)]" aria-hidden="true" />
          </>
        )}
        <HRLocaleSwitcher />
        <HRThemeToggle />
        <HRAvatarMenu email={email} fullName={fullName} />
      </div>
    </header>
  );
}
