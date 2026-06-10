import {
  Home,
  Briefcase,
  Users,
  Radar,
  Activity,
  LayoutTemplate,
  Archive,
  Settings as SettingsIcon,
} from "lucide-react";
import type { ComponentType } from "react";
import type { TranslationKey } from "@/lib/i18n/types";

export interface HRNavItem {
  labelKey: TranslationKey;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** Which sidebar counter feeds this item's badge, if any. */
  countKey?: "jobs" | "candidates";
  /** Show the persimmon "new" dot when newCandidates > 0. */
  newDot?: boolean;
}

/**
 * Primary recruiter destinations — the object-centric workflow.
 * These are the reachable, first-class targets on both the desktop rail and
 * the mobile bottom navigation: Home, Jobs, Candidates, Sourcing, Activity.
 */
export const HR_PRIMARY_NAV: HRNavItem[] = [
  { labelKey: "hr.nav.home", href: "/hr/dashboard", icon: Home },
  { labelKey: "hr.nav.jobs", href: "/hr/jobs", icon: Briefcase, countKey: "jobs" },
  {
    labelKey: "hr.nav.candidates",
    href: "/hr/candidates",
    icon: Users,
    countKey: "candidates",
    newDot: true,
  },
  { labelKey: "hr.nav.sourcing", href: "/hr/sourcing", icon: Radar },
  { labelKey: "hr.nav.activity", href: "/hr/activity", icon: Activity },
];

/**
 * Secondary administration — quiet by design. Lives below the primary rail on
 * desktop and inside the mobile "More" sheet.
 */
export const HR_MANAGE_NAV: HRNavItem[] = [
  { labelKey: "hr.nav.templates", href: "/hr/settings/templates", icon: LayoutTemplate },
  { labelKey: "hr.nav.archive", href: "/hr/jobs?status=closed", icon: Archive },
  { labelKey: "hr.nav.settings", href: "/hr/settings", icon: SettingsIcon },
];

export interface SidebarCounts {
  jobs?: number;
  candidates?: number;
  newCandidates?: number;
}

/**
 * Active-route matching shared by every HR navigation surface so the desktop
 * rail and mobile bottom bar always agree on the selected destination.
 *
 * Query-string entries (e.g. the Archive shortcut) only match when their query
 * is present, so plain `/hr/jobs` never lights up Archive.
 */
export function isHRNavActive(pathname: string, search: string, href: string): boolean {
  const [base, query] = href.split("?");

  if (query) {
    const params = new URLSearchParams(search);
    const target = new URLSearchParams(query);
    if (base !== pathname) return false;
    for (const [key, value] of target) {
      if (params.get(key) !== value) return false;
    }
    return true;
  }

  // The Jobs item must not stay highlighted while viewing the Archive shortcut.
  if (base === "/hr/jobs") {
    return pathname === base && new URLSearchParams(search).get("status") !== "closed";
  }
  if (base === "/hr/dashboard") return pathname === base || pathname.startsWith(`${base}/`);
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function badgeCount(item: HRNavItem, counts: SidebarCounts | undefined): number | undefined {
  if (!item.countKey || !counts) return undefined;
  return counts[item.countKey];
}
