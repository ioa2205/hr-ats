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

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[232px] flex-col border-r border-[var(--color-rule)] bg-[var(--color-bone)]",
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

        <nav className="flex-1 overflow-y-auto px-2 py-2">
          {SECTIONS.map((section) => (
            <section key={section.labelKey} className="mb-3">
              <h2 className="px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-ink-5)] uppercase">
                {t(section.labelKey)}
              </h2>
              <ul className="flex flex-col gap-0.5">
                {section.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex h-8 items-center gap-2.5 rounded-[var(--radius-sm)] px-2 text-[13px] font-medium transition-colors",
                          active
                            ? "bg-[var(--color-persimmon-tint)] text-[var(--color-persimmon-2)]"
                            : "text-[var(--color-ink-3)] hover:bg-[var(--color-bone-2)] hover:text-[var(--color-ink)]",
                        )}
                        aria-current={active ? "page" : undefined}
                      >
                        <span
                          className={cn(
                            "shrink-0",
                            active ? "text-[var(--color-persimmon)]" : "text-[var(--color-ink-4)]",
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

function Wordmark() {
  return (
    <span className="flex items-center gap-2 font-[var(--font-tez-sans)] text-[14px] font-semibold text-[var(--color-ink)]">
      <span
        className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-persimmon)]"
        aria-hidden="true"
      />
      <span>TezHR</span>
      <span className="font-normal text-[var(--color-ink-4)]">·</span>
      <span className="font-normal text-[var(--color-ink-3)]">Operator</span>
    </span>
  );
}
