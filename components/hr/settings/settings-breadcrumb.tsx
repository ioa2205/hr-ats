"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru as ruLocale, enUS, uz } from "date-fns/locale";
import { useTranslation } from "@/lib/i18n/provider";
import type { Locale, TranslationKey } from "@/lib/i18n/types";

type SectionKey =
  | "profile"
  | "notifications"
  | "company"
  | "team"
  | "templates"
  | "ai"
  | "billing";

const SECTION_LABELS: Record<SectionKey, TranslationKey> = {
  profile: "hr.settings.nav.profile",
  notifications: "hr.settings.nav.notifications",
  company: "hr.settings.nav.company",
  team: "hr.settings.nav.team",
  templates: "hr.settings.nav.templates",
  ai: "hr.settings.nav.ai",
  billing: "hr.settings.nav.billing",
};

const SECTION_GROUP: Record<SectionKey, "personal" | "workspace"> = {
  profile: "personal",
  notifications: "personal",
  company: "workspace",
  team: "workspace",
  templates: "workspace",
  ai: "workspace",
  billing: "workspace",
};

const dateLocaleByLocale: Record<Locale, typeof ruLocale> = {
  ru: ruLocale,
  uz,
  en: enUS,
};

interface LastSavedResponse {
  at: string | null;
  actor: string | null;
}

export function SettingsBreadcrumb() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const section = deriveSection(pathname);

  if (!section) return null;

  const group = SECTION_GROUP[section];
  const sectionLabel = t(SECTION_LABELS[section]);
  const groupLabel =
    group === "personal"
      ? t("hr.settings.breadcrumb.personal")
      : t("hr.settings.breadcrumb.workspace");

  return (
    <div
      className="mb-4 flex items-center justify-between gap-3 text-[11px]"
      style={{ fontFamily: "var(--font-tez-mono)", letterSpacing: "0.04em" }}
    >
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5">
        <Link
          href="/hr/settings"
          className="text-ink-5 hover:text-ink-3 transition-colors"
        >
          {t("hr.settings.breadcrumb.root")}
        </Link>
        <Separator />
        <span className="text-ink-5">{groupLabel}</span>
        <Separator />
        <span className="text-ink-3 font-semibold">{sectionLabel}</span>
      </nav>
      <LastSavedCaption key={section} section={section} />
    </div>
  );
}

function Separator() {
  return (
    <span aria-hidden className="text-ink-6">
      /
    </span>
  );
}

function LastSavedCaption({ section }: { section: SectionKey }) {
  const { t, locale } = useTranslation();
  const [state, setState] = useState<"loading" | LastSavedResponse>("loading");

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/hr/settings/last-saved?section=${section}`, {
      credentials: "same-origin",
      cache: "no-store",
    })
      .then((r) => (r.ok ? (r.json() as Promise<LastSavedResponse>) : null))
      .then((data) => {
        if (cancelled) return;
        setState(data ?? { at: null, actor: null });
      })
      .catch(() => {
        if (!cancelled) setState({ at: null, actor: null });
      });
    return () => {
      cancelled = true;
    };
  }, [section]);

  if (state === "loading") {
    return <span className="text-ink-6">{t("hr.settings.last_saved_loading")}</span>;
  }
  if (!state.at) {
    return <span className="text-ink-5">{t("hr.settings.last_saved_none")}</span>;
  }
  const ago = formatDistanceToNow(new Date(state.at), {
    addSuffix: true,
    locale: dateLocaleByLocale[locale],
  });
  return (
    <span className="text-ink-4 truncate" title={new Date(state.at).toLocaleString()}>
      {t("hr.settings.last_saved_by", {
        ago,
        name: state.actor ?? "—",
      })}
    </span>
  );
}

function deriveSection(pathname: string): SectionKey | null {
  const match = pathname.match(/^\/hr\/settings\/(profile|notifications|company|team|templates|ai|billing)(?:\/|$)/);
  return (match?.[1] as SectionKey | undefined) ?? null;
}
