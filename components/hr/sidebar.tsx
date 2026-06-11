"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompanyOption } from "./company-switcher";
import { CompanySwitcherMenu } from "./company-switcher";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/provider";
import { TezSignalMark, TezSignalWordmark } from "@/components/brand/tez-signal";
import {
  getSidebarServerSnapshot,
  getSidebarSnapshot,
  subscribeSidebar,
  writeSidebarCollapsed,
} from "@/lib/ui/sidebar-store";
import {
  HR_MANAGE_NAV,
  HR_PRIMARY_NAV,
  badgeCount,
  isHRNavActive,
  type HRNavItem,
  type SidebarCounts,
} from "./nav-items";

interface SidebarProps {
  currentCompany?: CompanyOption;
  companies?: CompanyOption[];
  // Kept for back-compat with callers that still pass it; not used here.
  locale?: Locale;
  quotaBanner?: React.ReactNode;
  counts?: SidebarCounts;
}

/**
 * Desktop HR rail. Google-first, content-focused: the five primary recruiter
 * destinations are prominent with comfortable 40px targets and a Signal Blue
 * tonal selection, while workspace administration sits in a quiet "Manage"
 * group below. Collapsible to an icon-only rail (persisted across reloads).
 * Hidden under `md` — the mobile shell owns small screens.
 */
export function Sidebar({ currentCompany, companies, quotaBanner, counts }: SidebarProps) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { t } = useTranslation();
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );

  return (
    <aside
      data-collapsed={collapsed ? "true" : undefined}
      className={cn(
        "sticky top-[var(--app-sticky-top)] hidden h-[calc(100vh-var(--app-sticky-top))] shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface-subtle)] transition-[width] duration-200 ease-[var(--ease-standard)] md:flex",
        collapsed ? "w-[68px]" : "w-[240px]",
      )}
    >
      <div className={cn("flex h-14 items-center", collapsed ? "justify-center px-0" : "px-5")}>
        <Link
          href="/hr/dashboard"
          className="inline-flex rounded-[var(--radius-sm)] outline-none"
          aria-label="TezHR"
        >
          {collapsed ? (
            <TezSignalMark size={22} className="text-[var(--color-primary)]" />
          ) : (
            <TezSignalWordmark size={15} />
          )}
        </Link>
      </div>

      {/* Company switcher — hidden in the collapsed rail (needs width to read). */}
      {currentCompany && !collapsed && (
        <div className="px-3 pb-3">
          <CompanySwitcherMenu currentCompany={currentCompany} companies={companies ?? []} />
        </div>
      )}

      <nav
        aria-label={t("hr.nav.primary_aria")}
        className={cn("flex-1 overflow-y-auto overflow-x-hidden pb-2", collapsed ? "px-2" : "px-3")}
      >
        <ul className="flex flex-col gap-1">
          {HR_PRIMARY_NAV.map((item) => (
            <li key={item.href}>
              <RailLink
                item={item}
                active={isHRNavActive(pathname, search, item.href)}
                label={t(item.labelKey)}
                count={badgeCount(item, counts)}
                showNewDot={item.newDot && (counts?.newCandidates ?? 0) > 0}
                collapsed={collapsed}
              />
            </li>
          ))}
        </ul>

        <div className={cn("mt-6", collapsed && "mt-3 border-t border-[var(--color-line)] pt-3")}>
          {!collapsed && (
            <h2 className="px-3 pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
              {t("hr.nav.section_manage")}
            </h2>
          )}
          <ul className="flex flex-col gap-0.5">
            {HR_MANAGE_NAV.map((item) => (
              <li key={item.href}>
                <ManageLink
                  item={item}
                  active={isHRNavActive(pathname, search, item.href)}
                  label={t(item.labelKey)}
                  collapsed={collapsed}
                />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Trial / quota banner (full only when expanded) */}
      {quotaBanner && !collapsed && <div className="mt-auto">{quotaBanner}</div>}

      {/* Collapse toggle */}
      <div
        className={cn(
          "mt-auto border-t border-[var(--color-line)]",
          collapsed ? "px-2 py-2" : "px-3 py-2",
        )}
      >
        <button
          type="button"
          onClick={() => writeSidebarCollapsed(!collapsed)}
          aria-label={collapsed ? t("hr.nav.expand") : t("hr.nav.collapse")}
          aria-expanded={!collapsed}
          title={collapsed ? t("hr.nav.expand") : t("hr.nav.collapse")}
          className={cn(
            "flex h-9 items-center rounded-[var(--radius-md)] text-[13px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]",
            collapsed ? "w-full justify-center" : "w-full gap-2.5 px-3",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px] shrink-0" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 truncate text-left">{t("hr.nav.collapse")}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

function RailLink({
  item,
  active,
  label,
  count,
  showNewDot,
  collapsed,
}: {
  item: HRNavItem;
  active: boolean;
  label: string;
  count?: number;
  showNewDot?: boolean;
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  if (collapsed) {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={label}
        title={label}
        className={cn(
          "group relative flex h-10 items-center justify-center rounded-[var(--radius-md)] transition-colors",
          active
            ? "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]"
            : "text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]",
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        {(showNewDot || (count != null && count > 0)) && (
          <span
            className={cn(
              "absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full",
              showNewDot ? "bg-[var(--color-accent)]" : "bg-[var(--color-primary)]",
            )}
            aria-hidden="true"
          />
        )}
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-10 items-center gap-3 rounded-[var(--radius-md)] px-3 text-[13.5px] transition-colors",
        active
          ? "bg-[var(--color-primary-container)] font-semibold text-[var(--color-on-primary-container)]"
          : "font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]",
      )}
    >
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0",
          active
            ? "text-[var(--color-on-primary-container)]"
            : "text-[var(--color-text-subtle)] group-hover:text-[var(--color-text-muted)]",
        )}
      />
      <span className="flex-1 truncate">{label}</span>
      {showNewDot && (
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]"
          aria-hidden="true"
        />
      )}
      {count != null && count > 0 && (
        <span
          className={cn(
            "min-w-[20px] rounded-full px-1.5 py-px text-center text-[11px] font-[var(--font-mono)] tabular-nums",
            active
              ? "bg-[color-mix(in_srgb,var(--color-on-primary-container)_16%,transparent)] text-[var(--color-on-primary-container)]"
              : "bg-[var(--color-surface-strong)] text-[var(--color-text-muted)]",
          )}
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}

function ManageLink({
  item,
  active,
  label,
  collapsed,
}: {
  item: HRNavItem;
  active: boolean;
  label: string;
  collapsed?: boolean;
}) {
  const Icon = item.icon;
  if (collapsed) {
    return (
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        aria-label={label}
        title={label}
        className={cn(
          "flex h-10 items-center justify-center rounded-[var(--radius-md)] transition-colors",
          active
            ? "bg-[var(--color-surface-strong)] text-[var(--color-text)]"
            : "text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]",
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
      </Link>
    );
  }
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-3 rounded-[var(--radius-sm)] px-3 text-[12.5px] transition-colors",
        active
          ? "bg-[var(--color-surface-strong)] font-medium text-[var(--color-text)]"
          : "text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </Link>
  );
}

/** Fallback org-only tile for when company-switcher is hidden (kept for minimal case). */
export function OrgTile({ currentCompany }: { currentCompany: CompanyOption }) {
  return (
    <div className="mx-2 mb-2 flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-2 transition-colors hover:bg-[var(--color-surface-subtle)]">
      {currentCompany.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentCompany.logo_url}
          alt=""
          className="h-[22px] w-[22px] shrink-0 rounded-[var(--radius-sm)] object-cover"
        />
      ) : (
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-text)] text-[11px] font-semibold text-[var(--color-surface)]">
          {currentCompany.name.slice(0, 1).toUpperCase() || <Building2 className="h-3 w-3" />}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[12px] font-semibold tracking-[-0.005em]">
          {currentCompany.name}
        </span>
        <span className="truncate text-[10.5px] text-[var(--color-text-muted)] capitalize">
          {currentCompany.role}
        </span>
      </div>
      <ChevronDown className="h-3.5 w-3.5 text-[var(--color-text-subtle)]" />
    </div>
  );
}
