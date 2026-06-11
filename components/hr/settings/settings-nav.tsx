"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Bell,
  Building,
  Users,
  LayoutTemplate,
  Sparkles,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";
import { Badge } from "@/components/ui";
import type { CompanyRole } from "@/types";
import type { TranslationKey } from "@/lib/i18n/types";
import type { SettingsNavWarnings } from "@/lib/settings/warnings";

type SectionKey =
  | "profile"
  | "notifications"
  | "company"
  | "team"
  | "templates"
  | "ai"
  | "billing";

interface TabDef {
  key: SectionKey;
  labelKey: TranslationKey;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  allowed?: CompanyRole[];
  group: "personal" | "workspace";
}

const TABS: TabDef[] = [
  {
    key: "profile",
    labelKey: "hr.settings.nav.profile",
    href: "/hr/settings/profile",
    icon: User,
    group: "personal",
  },
  {
    key: "notifications",
    labelKey: "hr.settings.nav.notifications",
    href: "/hr/settings/notifications",
    icon: Bell,
    group: "personal",
  },
  {
    key: "company",
    labelKey: "hr.settings.nav.company",
    href: "/hr/settings/company",
    icon: Building,
    group: "workspace",
  },
  {
    key: "team",
    labelKey: "hr.settings.nav.team",
    href: "/hr/settings/team",
    icon: Users,
    group: "workspace",
  },
  {
    key: "templates",
    labelKey: "hr.settings.nav.templates",
    href: "/hr/settings/templates",
    icon: LayoutTemplate,
    group: "workspace",
  },
  {
    key: "ai",
    labelKey: "hr.settings.nav.ai",
    href: "/hr/settings/ai",
    icon: Sparkles,
    group: "workspace",
  },
  {
    key: "billing",
    labelKey: "hr.settings.nav.billing",
    href: "/hr/settings/billing",
    icon: CreditCard,
    group: "workspace",
  },
];

interface BadgeState {
  dot: boolean;
  dotTitle?: string;
  plan?: "pro" | "trial";
  unread?: number;
}

export function SettingsNav({
  role,
  warnings,
}: {
  role: CompanyRole;
  warnings: SettingsNavWarnings;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();

  const badgeFor = (key: SectionKey): BadgeState => {
    switch (key) {
      case "billing":
        return {
          dot: warnings.billing.trialEnding,
          dotTitle: t("hr.settings.nav.warning.trial_ending"),
          plan: warnings.billing.plan ?? undefined,
        };
      case "company":
        return {
          dot: warnings.company.noLogo,
          dotTitle: t("hr.settings.nav.warning.no_logo"),
        };
      case "team":
        return {
          dot: warnings.team.soleOwner,
          dotTitle: t("hr.settings.nav.warning.sole_owner"),
        };
      case "ai":
        return {
          dot: warnings.ai.disabled,
          dotTitle: t("hr.settings.nav.warning.ai_disabled"),
        };
      case "notifications":
        return { dot: false, unread: warnings.notifications.unread };
      default:
        return { dot: false };
    }
  };

  const personal = TABS.filter((t) => t.group === "personal");
  const workspace = TABS.filter((t) => t.group === "workspace");

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const visible = (tb: TabDef) => !tb.allowed || tb.allowed.includes(role);

  return (
    <>
      {/* Desktop rail — persistent from lg up */}
      <nav
        aria-label={t("hr.settings.nav.collapse_aria")}
        className="sticky top-[72px] hidden h-[calc(100vh-88px)] w-[240px] shrink-0 flex-col gap-5 overflow-y-auto border-r border-[var(--color-line)] bg-[var(--color-surface-subtle)] py-5 pr-2 pl-1 lg:flex"
      >
        <RailGroup
          title={t("hr.settings.group.personal")}
          items={personal.filter(visible)}
          isActive={isActive}
          badgeFor={badgeFor}
        />
        <RailGroup
          title={t("hr.settings.group.workspace")}
          items={workspace.filter(visible)}
          isActive={isActive}
          badgeFor={badgeFor}
        />
      </nav>

      {/* Mobile scroller — horizontal chip strip under lg */}
      <nav
        aria-label={t("hr.settings.nav.collapse_aria")}
        className="-mx-4 mb-4 flex gap-1 overflow-x-auto border-b border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-4 py-2 lg:hidden"
      >
        {TABS.filter(visible).map((tb) => {
          const active = isActive(tb.href);
          const badge = badgeFor(tb.key);
          const Icon = tb.icon;
          return (
            <Link
              key={tb.href}
              href={tb.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] border px-3 text-[12.5px] font-medium transition-colors",
                active
                  ? "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-level-1"
                  : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(tb.labelKey)}
              {badge.dot && <DotGlyph title={badge.dotTitle} />}
              {typeof badge.unread === "number" && badge.unread > 0 && (
                <UnreadGlyph count={badge.unread} />
              )}
              {badge.plan && <PlanBadge plan={badge.plan} />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function RailGroup({
  title,
  items,
  isActive,
  badgeFor,
}: {
  title: string;
  items: TabDef[];
  isActive: (href: string) => boolean;
  badgeFor: (key: SectionKey) => BadgeState;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="data-mono px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
        {title}
      </div>
      <div className="flex flex-col gap-[1px]">
        {items.map((tb) => {
          const active = isActive(tb.href);
          const badge = badgeFor(tb.key);
          const Icon = tb.icon;
          return (
            <Link
              key={tb.href}
              href={tb.href}
              aria-current={active ? "page" : undefined}
              title={badge.dot ? badge.dotTitle : undefined}
              className={cn(
                "group relative flex items-center gap-2 border-l-2 py-[9px] pr-2.5 pl-[11px] text-[12.5px] tracking-[-0.005em] transition-colors",
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-surface)] font-semibold text-[var(--color-text)] shadow-[inset_-1px_0_0_var(--color-line)]"
                  : "border-transparent font-medium text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-text)]",
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "opacity-100" : "opacity-75")} />
              <span className="flex-1 truncate">{t(tb.labelKey)}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {badge.dot && <DotGlyph title={badge.dotTitle} />}
                {typeof badge.unread === "number" && badge.unread > 0 && (
                  <UnreadGlyph count={badge.unread} />
                )}
                {badge.plan && <PlanBadge plan={badge.plan} />}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function DotGlyph({ title }: { title?: string }) {
  return (
    <span
      aria-hidden={!title}
      title={title}
      className="inline-block h-[6px] w-[6px] rounded-full bg-[var(--color-accent)]"
    />
  );
}

function UnreadGlyph({ count }: { count: number }) {
  const label = count > 99 ? "99+" : String(count);
  return (
    <span className="data-mono inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-[8px] bg-[var(--color-primary)] px-1 text-[10px] font-semibold tabular-nums text-[var(--color-on-primary)]">
      {label}
    </span>
  );
}

function PlanBadge({ plan }: { plan: "pro" | "trial" }) {
  const { t } = useTranslation();
  return (
    <Badge tone={plan === "pro" ? "accent" : "neutral"} size="sm" className="px-1.5 py-0">
      <span className="data-mono text-[9.5px] uppercase tracking-[0.1em]">
        {plan === "pro" ? t("hr.settings.nav.plan_pro") : t("hr.settings.nav.plan_trial")}
      </span>
    </Badge>
  );
}
