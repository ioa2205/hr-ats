"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Briefcase,
  Users,
  Activity,
  Settings as SettingsIcon,
  LayoutTemplate,
  Archive,
  Menu,
  X,
  Building2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompanyOption } from "./company-switcher";
import { CompanySwitcherMenu } from "./company-switcher";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import { useTranslation } from "@/lib/i18n/provider";

interface NavItem {
  labelKey: TranslationKey;
  href: string;
  icon: React.ReactNode;
  count?: number;
  dot?: boolean;
}

interface NavSection {
  labelKey: TranslationKey;
  items: NavItem[];
}

interface SidebarProps {
  currentCompany?: CompanyOption;
  companies?: CompanyOption[];
  // Kept for back-compat with callers that still pass it; not used here.
  locale?: Locale;
  quotaBanner?: React.ReactNode;
  counts?: { jobs?: number; candidates?: number; newCandidates?: number };
}

export function Sidebar({
  currentCompany,
  companies,
  quotaBanner,
  counts,
}: SidebarProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const sections: NavSection[] = [
    {
      labelKey: "hr.nav.section_workspace",
      items: [
        {
          labelKey: "hr.nav.dashboard",
          href: "/hr/dashboard",
          icon: <LayoutGrid className="h-4 w-4" />,
        },
        {
          labelKey: "hr.nav.jobs",
          href: "/hr/jobs",
          icon: <Briefcase className="h-4 w-4" />,
          count: counts?.jobs,
        },
        {
          labelKey: "hr.nav.candidates",
          href: "/hr/candidates",
          icon: <Users className="h-4 w-4" />,
          count: counts?.candidates,
          dot: (counts?.newCandidates ?? 0) > 0,
        },
        {
          labelKey: "hr.nav.activity",
          href: "/hr/activity",
          icon: <Activity className="h-4 w-4" />,
        },
      ],
    },
    {
      labelKey: "hr.nav.section_tools",
      items: [
        {
          labelKey: "hr.nav.templates",
          href: "/hr/settings/templates",
          icon: <LayoutTemplate className="h-4 w-4" />,
        },
        {
          labelKey: "hr.nav.archive",
          href: "/hr/jobs?status=closed",
          icon: <Archive className="h-4 w-4" />,
        },
        {
          labelKey: "hr.nav.settings",
          href: "/hr/settings",
          icon: <SettingsIcon className="h-4 w-4" />,
        },
      ],
    },
  ];

  function isActive(href: string) {
    const base = href.split("?")[0];
    if (base === "/hr/dashboard") return pathname === base || pathname.startsWith(base);
    return pathname.startsWith(base);
  }

  return (
    <>
      {/* Mobile top bar */}
      <header className="flex h-12 items-center gap-3 border-b border-[var(--color-rule)] bg-[var(--color-bone)] px-4 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-[var(--radius-sm)] p-1.5 text-[var(--color-ink-3)] hover:bg-[var(--color-bone-2)]"
          aria-label={t("hr.nav.open_menu")}
        >
          <Menu className="h-5 w-5" />
        </button>
        <Wordmark />
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[200px] flex-col border-r border-[var(--color-rule)] bg-[var(--color-bone)]",
          "transition-transform duration-300 ease-[var(--ease-emphasized)]",
          "md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-12 items-center justify-between px-4">
          <Wordmark />
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--color-ink-4)] md:hidden"
            aria-label={t("hr.nav.close_menu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Org switcher */}
        {currentCompany && (
          <div className="px-2 pb-2">
            <CompanySwitcherMenu
              currentCompany={currentCompany}
              companies={companies ?? []}
            />
          </div>
        )}

        {/* Trial banner */}
        {quotaBanner}

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {sections.map((section) => (
            <section key={section.labelKey} className="mb-3">
              <h2 className="px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-ink-5)] uppercase">
                {t(section.labelKey)}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "group flex h-8 items-center gap-2.5 rounded-[var(--radius-sm)] px-2 text-[12px] font-medium transition-colors",
                          active
                            ? "bg-[var(--color-ink)] text-[var(--color-bone)]"
                            : "text-[var(--color-ink-4)] hover:bg-[var(--color-bone-2)] hover:text-[var(--color-ink)]",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <span
                          className={cn(
                            "shrink-0",
                            active
                              ? "text-[var(--color-bone)]"
                              : "text-[var(--color-ink-5)] group-hover:text-[var(--color-ink-3)]",
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="flex-1 truncate">{t(item.labelKey)}</span>
                        {item.dot && (
                          <span className="h-[5px] w-[5px] rounded-full bg-[var(--color-persimmon)]" />
                        )}
                        {item.count != null && (
                          <span
                            className={cn(
                              "rounded-[var(--radius-sm)] px-1.5 py-[1px] text-[10px] font-[var(--font-tez-mono)]",
                              active
                                ? "bg-[var(--color-bone)]/15 text-[var(--color-bone)]"
                                : "bg-[var(--color-bone-2)] text-[var(--color-ink-4)]",
                            )}
                          >
                            {item.count}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>
      </aside>
    </>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2 font-[var(--font-tez-sans)] text-[14px] font-semibold text-[var(--color-ink)]">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-persimmon)]"
        aria-hidden="true"
      />
      <span>TezHR</span>
    </span>
  );
}

/** Fallback org-only tile for when company-switcher is hidden (kept for minimal case). */
export function OrgTile({ currentCompany }: { currentCompany: CompanyOption }) {
  return (
    <div className="mx-2 mb-2 flex cursor-pointer items-center gap-2.5 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-bone)] px-2.5 py-2 transition-colors hover:bg-[var(--color-bone-2)]">
      {currentCompany.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentCompany.logo_url}
          alt=""
          className="h-[22px] w-[22px] shrink-0 rounded-[var(--radius-sm)] object-cover"
        />
      ) : (
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-ink)] text-[11px] font-semibold text-[var(--color-bone)]">
          {currentCompany.name.slice(0, 1).toUpperCase() || <Building2 className="h-3 w-3" />}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[12px] font-semibold tracking-[-0.005em]">
          {currentCompany.name}
        </span>
        <span className="truncate text-[10.5px] capitalize text-[var(--color-ink-4)]">
          {currentCompany.role}
        </span>
      </div>
      <ChevronDown className="h-3.5 w-3.5 text-[var(--color-ink-5)]" />
    </div>
  );
}
