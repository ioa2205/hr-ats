"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  Briefcase,
  Building2,
  ClipboardList,
  FileText,
  Inbox,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Radar,
  Settings,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { TezSignalMark, TezSignalWordmark } from "@/components/brand/tez-signal";
import {
  getSidebarServerSnapshot,
  getSidebarSnapshot,
  subscribeSidebar,
  writeSidebarCollapsed,
} from "@/lib/ui/sidebar-store";

interface NavItem {
  labelKey: TranslationKey;
  href: string;
  icon: React.ReactNode;
}

interface NavSection {
  labelKey: TranslationKey;
  items: NavItem[];
}

const SECTIONS: NavSection[] = [
  {
    labelKey: "operator.nav.section_overview",
    items: [
      {
        labelKey: "admin.nav.dashboard",
        href: "/operator",
        icon: <LayoutDashboard className="h-4 w-4" />,
      },
      {
        labelKey: "inbox.title",
        href: "/operator/inbox",
        icon: <Inbox className="h-4 w-4" />,
      },
    ],
  },
  {
    labelKey: "operator.nav.section_tenants",
    items: [
      {
        labelKey: "admin.nav.companies",
        href: "/operator/companies",
        icon: <Building2 className="h-4 w-4" />,
      },
      {
        labelKey: "admin.nav.users",
        href: "/operator/users",
        icon: <Users className="h-4 w-4" />,
      },
      {
        labelKey: "admin.postings",
        href: "/operator/postings",
        icon: <Briefcase className="h-4 w-4" />,
      },
    ],
  },
  {
    labelKey: "operator.nav.section_platform",
    items: [
      {
        labelKey: "operator.nav.incidents",
        href: "/operator/incidents",
        icon: <AlertTriangle className="h-4 w-4" />,
      },
      {
        labelKey: "admin.processing_log",
        href: "/operator/processing",
        icon: <Activity className="h-4 w-4" />,
      },
      {
        labelKey: "operator.sourcing.title",
        href: "/operator/sourcing",
        icon: <Radar className="h-4 w-4" />,
      },
      {
        labelKey: "admin.templates",
        href: "/operator/templates",
        icon: <FileText className="h-4 w-4" />,
      },
      {
        labelKey: "admin.audit_log",
        href: "/operator/audit",
        icon: <ClipboardList className="h-4 w-4" />,
      },
      {
        labelKey: "operator.nav.settings",
        href: "/operator/settings",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/operator") return pathname === "/operator";
  return pathname.startsWith(href);
}

export function OperatorSidebar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    getSidebarSnapshot,
    getSidebarServerSnapshot,
  );

  return (
    <>
      {/* Mobile top bar — operator console is desktop-first but must stay usable. */}
      <header className="flex h-12 items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-4 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]"
          aria-label={t("hr.nav.open_menu")}
        >
          <Menu className="h-5 w-5" />
        </button>
        <TezSignalWordmark size={14} suffix="Operator" />
      </header>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[color-mix(in_srgb,#000_45%,transparent)] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        data-collapsed={collapsed ? "true" : "false"}
        className={cn(
          "nav-rail fixed inset-y-0 left-0 z-50 flex w-[224px] flex-col border-r border-[var(--color-line)] bg-[var(--color-surface-subtle)]",
          "transition-transform duration-300 ease-[var(--ease-emphasized)] md:transition-[width] md:duration-200",
          "md:sticky md:top-[var(--app-sticky-top)] md:h-[calc(100vh-var(--app-sticky-top))] md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          collapsed ? "md:w-[68px]" : "md:w-[224px]",
        )}
      >
        <div className="nav-rail-header flex h-12 items-center justify-between px-4">
          <span className="nav-rail-wordmark">
            <TezSignalWordmark size={14} suffix="Operator" />
          </span>
          <TezSignalMark size={20} className="nav-rail-mark text-[var(--color-primary)]" />
          <button
            onClick={() => setMobileOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] md:hidden"
            aria-label={t("hr.nav.close_menu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2">
          {SECTIONS.map((section) => (
            <section key={section.labelKey} className="mb-2.5">
              <h2 className="nav-rail-heading px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
                {t(section.labelKey)}
              </h2>
              <ul className="flex flex-col gap-px">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        title={t(item.labelKey)}
                        className={cn(
                          "nav-rail-link flex h-8 items-center gap-2.5 rounded-[var(--radius-sm)] px-2 text-[13px] transition-colors",
                          active
                            ? "bg-[var(--color-primary-container)] font-semibold text-[var(--color-on-primary-container)]"
                            : "font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <span
                          className={cn(
                            "shrink-0",
                            active
                              ? "text-[var(--color-on-primary-container)]"
                              : "text-[var(--color-text-subtle)]",
                          )}
                        >
                          {item.icon}
                        </span>
                        <span className="nav-rail-label truncate">{t(item.labelKey)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </nav>

        {/* Desktop collapse toggle */}
        <div className="mt-auto hidden border-t border-[var(--color-line)] p-2 md:block">
          <button
            type="button"
            onClick={() => writeSidebarCollapsed(!collapsed)}
            aria-label={collapsed ? t("hr.nav.expand") : t("hr.nav.collapse")}
            aria-expanded={!collapsed}
            title={collapsed ? t("hr.nav.expand") : t("hr.nav.collapse")}
            className={cn(
              "flex h-9 w-full items-center rounded-[var(--radius-md)] text-[12.5px] font-medium text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text)]",
              collapsed ? "justify-center" : "gap-2.5 px-2",
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate text-left">{t("hr.nav.collapse")}</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
