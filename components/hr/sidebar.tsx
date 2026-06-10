"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompanyOption } from "./company-switcher";
import { CompanySwitcherMenu } from "./company-switcher";
import type { Locale } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/provider";
import { TezSignalWordmark } from "@/components/brand/tez-signal";
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
 * destinations are prominent with comfortable 40px targets and a Tez Lapis
 * tonal selection, while workspace administration sits in a quiet "Manage"
 * group below. Hidden under `md` — the mobile shell owns small screens.
 */
export function Sidebar({ currentCompany, companies, quotaBanner, counts }: SidebarProps) {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const { t } = useTranslation();

  return (
    <aside className="sticky top-[var(--app-sticky-top)] hidden h-[calc(100vh-var(--app-sticky-top))] w-[240px] shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface-subtle)] md:flex">
      <div className="flex h-14 items-center px-5">
        <Link href="/hr/dashboard" className="inline-flex rounded-[var(--radius-sm)] outline-none">
          <TezSignalWordmark size={15} />
        </Link>
      </div>

      {/* Company switcher */}
      {currentCompany && (
        <div className="px-3 pb-3">
          <CompanySwitcherMenu currentCompany={currentCompany} companies={companies ?? []} />
        </div>
      )}

      <nav
        aria-label={t("hr.nav.primary_aria")}
        className="flex-1 overflow-y-auto px-3 pb-2"
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
              />
            </li>
          ))}
        </ul>

        <div className="mt-6">
          <h2 className="px-3 pb-1 text-[10.5px] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
            {t("hr.nav.section_manage")}
          </h2>
          <ul className="flex flex-col gap-0.5">
            {HR_MANAGE_NAV.map((item) => (
              <li key={item.href}>
                <ManageLink
                  item={item}
                  active={isHRNavActive(pathname, search, item.href)}
                  label={t(item.labelKey)}
                />
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Trial / quota banner */}
      {quotaBanner && <div className="mt-auto">{quotaBanner}</div>}
    </aside>
  );
}

function RailLink({
  item,
  active,
  label,
  count,
  showNewDot,
}: {
  item: HRNavItem;
  active: boolean;
  label: string;
  count?: number;
  showNewDot?: boolean;
}) {
  const Icon = item.icon;
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
}: {
  item: HRNavItem;
  active: boolean;
  label: string;
}) {
  const Icon = item.icon;
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
