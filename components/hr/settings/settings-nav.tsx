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
import { Pill } from "@/components/hr/design";
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

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const visible = (tb: TabDef) => !tb.allowed || tb.allowed.includes(role);

  return (
    <>
      {/* Desktop rail — persistent from lg up */}
      <nav
        aria-label={t("hr.settings.nav.collapse_aria")}
        className="bg-bone-2/40 border-rule sticky top-[72px] hidden h-[calc(100vh-88px)] w-[240px] shrink-0 flex-col gap-5 overflow-y-auto border-r py-5 pr-2 pl-1 lg:flex"
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

      {/* Mobile scroller — horizontal Seg-like strip under lg */}
      <nav
        aria-label={t("hr.settings.nav.collapse_aria")}
        className="border-rule bg-bone-2/40 -mx-4 mb-4 flex gap-1 overflow-x-auto border-b px-4 py-2 lg:hidden"
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
                "relative inline-flex h-7 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-2.5 text-[12px] font-medium transition-colors",
                active
                  ? "bg-paper text-ink border-rule-2 shadow-tez-1"
                  : "text-ink-4 hover:text-ink border-transparent",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {t(tb.labelKey)}
              {badge.dot && <DotGlyph title={badge.dotTitle} />}
              {typeof badge.unread === "number" && badge.unread > 0 && (
                <UnreadGlyph count={badge.unread} />
              )}
              {badge.plan && <PlanPill plan={badge.plan} />}
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
      <div
        className="text-ink-5 px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em]"
        style={{ fontFamily: "var(--font-tez-mono)" }}
      >
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
                "group relative flex items-center gap-2 py-[7px] pr-2.5 pl-[11px] text-[12.5px] tracking-[-0.005em] transition-colors",
                "border-l-2",
                active
                  ? "bg-paper text-ink border-ink font-semibold shadow-[inset_-1px_0_0_var(--color-rule)]"
                  : "text-ink-4 hover:bg-bone-2 hover:text-ink border-transparent font-medium",
              )}
            >
              <Icon
                className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  active ? "opacity-100" : "opacity-75",
                )}
              />
              <span className="flex-1 truncate">{t(tb.labelKey)}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {badge.dot && <DotGlyph title={badge.dotTitle} />}
                {typeof badge.unread === "number" && badge.unread > 0 && (
                  <UnreadGlyph count={badge.unread} />
                )}
                {badge.plan && <PlanPill plan={badge.plan} />}
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
      className="bg-persimmon inline-block h-[5px] w-[5px] rounded-full"
    />
  );
}

function UnreadGlyph({ count }: { count: number }) {
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      className="bg-ink text-paper inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-[8px] px-1 text-[10px] font-semibold tabular-nums"
      style={{ fontFamily: "var(--font-tez-mono)" }}
    >
      {label}
    </span>
  );
}

function PlanPill({ plan }: { plan: "pro" | "trial" }) {
  const { t } = useTranslation();
  return (
    <Pill tone={plan === "pro" ? "persimmon" : "outline"} className="!px-1.5 !py-0 !text-[9.5px]">
      <span
        className="uppercase tracking-[0.1em]"
        style={{ fontFamily: "var(--font-tez-mono)" }}
      >
        {plan === "pro"
          ? t("hr.settings.nav.plan_pro")
          : t("hr.settings.nav.plan_trial")}
      </span>
    </Pill>
  );
}
