"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui";
import { TezSignalWordmark } from "@/components/brand/tez-signal";
import { useTranslation } from "@/lib/i18n/provider";
import { useHRChrome } from "./hr-chrome-context";
import { HRThemeToggle } from "./theme-toggle";
import { HRLocaleSwitcher } from "./hr-locale-switcher";
import { HRAvatarMenu } from "./hr-avatar-menu";
import { NotificationsBell } from "./notifications-bell";
import { CompanySwitcherMenu } from "./company-switcher";
import type { CompanyOption } from "./company-switcher";
import {
  HR_MANAGE_NAV,
  HR_PRIMARY_NAV,
  badgeCount,
  isHRNavActive,
  type SidebarCounts,
} from "./nav-items";

interface MobileChromeProps {
  email: string;
  fullName: string | null;
  notifications: { companyId: string; userId: string } | null;
  currentCompany?: CompanyOption;
  companies?: CompanyOption[];
  quotaBanner?: ReactNode;
}

/**
 * Mobile HR top bar + "More" sheet. A compact, reachable header for phones and
 * tablets: a Menu button opens secondary administration (Manage), company
 * switching, theme, locale, and the trial banner, while search, notifications,
 * and the profile menu stay one tap away. Hidden from `md` up where the desktop
 * rail + top bar take over.
 */
export function HRMobileChrome({
  email,
  fullName,
  notifications,
  currentCompany,
  companies,
  quotaBanner,
}: MobileChromeProps) {
  const { t } = useTranslation();
  const { setPaletteOpen } = useHRChrome();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <header className="sticky top-[var(--app-sticky-top)] z-30 flex h-14 items-center gap-2 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-canvas)_88%,transparent)] px-3 backdrop-blur-sm md:hidden">
      <button
        type="button"
        onClick={() => setMoreOpen(true)}
        className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]"
        aria-label={t("hr.nav.more_title")}
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link href="/hr/dashboard" className="inline-flex rounded-[var(--radius-sm)] outline-none">
        <TezSignalWordmark size={15} />
      </Link>

      <div className="flex-1" />

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="grid h-11 w-11 place-items-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]"
        aria-label={t("hr.palette.title")}
      >
        <Search className="h-[18px] w-[18px]" />
      </button>
      {notifications && (
        <NotificationsBell companyId={notifications.companyId} userId={notifications.userId} />
      )}
      <HRAvatarMenu email={email} fullName={fullName} />

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="left" className="max-w-[320px]">
          <SheetHeader>
            <SheetTitle>{t("hr.nav.more_title")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto">
            {currentCompany && (
              <div className="px-4 pt-4 pb-2">
                <CompanySwitcherMenu
                  currentCompany={currentCompany}
                  companies={companies ?? []}
                />
              </div>
            )}

            {quotaBanner && <div className="px-2">{quotaBanner}</div>}

            <nav className="px-3 pt-2" aria-label={t("hr.nav.section_manage")}>
              <h2 className="px-2 pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
                {t("hr.nav.section_manage")}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {HR_MANAGE_NAV.map((item) => {
                  const Icon = item.icon;
                  const active = isHRNavActive(pathname, search, item.href);
                  return (
                    <li key={item.href}>
                      <SheetClose asChild>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex h-11 items-center gap-3 rounded-[var(--radius-md)] px-2.5 text-[13.5px] transition-colors",
                            active
                              ? "bg-[var(--color-primary-container)] font-semibold text-[var(--color-on-primary-container)]"
                              : "font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]",
                          )}
                        >
                          <Icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="flex-1 truncate">{t(item.labelKey)}</span>
                        </Link>
                      </SheetClose>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-[var(--color-line)] px-4 py-3">
            <HRLocaleSwitcher />
            <HRThemeToggle />
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
}

/**
 * Fixed bottom navigation — the primary recruiter destinations always within
 * thumb reach on phones. Targets are 56px tall; the Material-3-style tonal pill
 * marks the selected tab without relying on color alone (the label and
 * `aria-current` also change).
 */
export function HRBottomNav({ counts }: { counts?: SidebarCounts }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const search = useSearchParams().toString();

  return (
    <nav
      aria-label={t("hr.nav.primary_aria")}
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-surface)_94%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-sm md:hidden"
    >
      {HR_PRIMARY_NAV.map((item) => {
        const Icon = item.icon;
        const active = isHRNavActive(pathname, search, item.href);
        const count = badgeCount(item, counts);
        const showNewDot = item.newDot && (counts?.newCandidates ?? 0) > 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className="group relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-sm)] py-1.5"
          >
            <span
              className={cn(
                "relative grid h-7 w-12 place-items-center rounded-full transition-colors",
                active ? "bg-[var(--color-primary-container)]" : "bg-transparent",
              )}
            >
              <Icon
                className={cn(
                  "h-[20px] w-[20px]",
                  active
                    ? "text-[var(--color-on-primary-container)]"
                    : "text-[var(--color-text-subtle)] group-hover:text-[var(--color-text-muted)]",
                )}
              />
              {showNewDot && (
                <span
                  className="absolute top-0.5 right-2.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent)] ring-2 ring-[var(--color-surface)]"
                  aria-hidden="true"
                />
              )}
              {count != null && count > 0 && !showNewDot && (
                <span
                  className="absolute -top-0.5 right-1.5 min-w-[15px] rounded-full bg-[var(--color-surface-strong)] px-1 text-center text-[9px] font-[var(--font-mono)] leading-[15px] text-[var(--color-text-muted)] ring-2 ring-[var(--color-surface)]"
                  aria-hidden="true"
                >
                  {count > 99 ? "99" : count}
                </span>
              )}
            </span>
            <span
              className={cn(
                "text-[10.5px] leading-none",
                active
                  ? "font-semibold text-[var(--color-text)]"
                  : "font-medium text-[var(--color-text-subtle)]",
              )}
            >
              {t(item.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
