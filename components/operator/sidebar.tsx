"use client";

import { useState } from "react";
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
  Radar,
  Settings,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { TezSignalWordmark } from "@/components/brand/tez-signal";

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
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[224px] flex-col border-r border-[var(--color-line)] bg-[var(--color-surface-subtle)]",
          "transition-transform duration-300 ease-[var(--ease-emphasized)]",
          "md:sticky md:top-[var(--app-sticky-top)] md:h-[calc(100vh-var(--app-sticky-top))] md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        <div className="flex h-12 items-center justify-between px-4">
          <TezSignalWordmark size={14} suffix="Operator" />
          <button
            onClick={() => setMobileOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-[var(--radius-md)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] md:hidden"
            aria-label={t("hr.nav.close_menu")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {SECTIONS.map((section) => (
            <section key={section.labelKey} className="mb-2.5">
              <h2 className="px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
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
                        className={cn(
                          "flex h-8 items-center gap-2.5 rounded-[var(--radius-sm)] px-2 text-[13px] transition-colors",
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
                        <span className="truncate">{t(item.labelKey)}</span>
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
