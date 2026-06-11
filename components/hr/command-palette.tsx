"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  ClipboardList,
  Command as CommandIcon,
  LayoutDashboard,
  Search,
  Settings,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import type { HRSearchResponse } from "@/lib/hr/search-schema";
import type { TranslationKey } from "@/lib/i18n/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ActionItem = {
  kind: "action";
  id: string;
  labelKey: TranslationKey;
  href: string;
  icon: React.ReactNode;
};

type JobItem = {
  kind: "job";
  id: string;
  title: string;
  status: string;
  href: string;
};

type CandidateItem = {
  kind: "candidate";
  id: string;
  fullName: string;
  jobTitle: string;
  matchScore: number | null;
  summary: string | null;
  href: string;
};

type Item = ActionItem | JobItem | CandidateItem;

const STATIC_ACTIONS: ActionItem[] = [
  {
    kind: "action",
    id: "dashboard",
    labelKey: "hr.palette.jump_dashboard",
    href: "/hr/dashboard",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    kind: "action",
    id: "jobs",
    labelKey: "hr.palette.jump_jobs",
    href: "/hr/jobs",
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    kind: "action",
    id: "candidates",
    labelKey: "hr.palette.jump_candidates",
    href: "/hr/candidates",
    icon: <Users className="h-4 w-4" />,
  },
  {
    kind: "action",
    id: "new-job",
    labelKey: "hr.palette.jump_new_job",
    href: "/hr/jobs/new",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    kind: "action",
    id: "templates",
    labelKey: "hr.palette.jump_templates",
    href: "/hr/settings/templates",
    icon: <ClipboardList className="h-4 w-4" />,
  },
  {
    kind: "action",
    id: "settings",
    labelKey: "hr.palette.jump_settings",
    href: "/hr/settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

export function HRCommandPalette({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <PaletteContent onOpenChange={onOpenChange} />}
    </Dialog>
  );
}

function PaletteContent({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [fetched, setFetched] = useState<{ q: string; data: HRSearchResponse | null }>({
    q: "",
    data: null,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 150);
    return () => window.clearTimeout(id);
  }, [q]);

  useEffect(() => {
    if (debouncedQ.length === 0) return;
    const ctrl = new AbortController();
    fetch(`/api/hr/search?q=${encodeURIComponent(debouncedQ)}`, {
      signal: ctrl.signal,
      cache: "no-store",
    })
      .then((res) => (res.ok ? (res.json() as Promise<HRSearchResponse>) : null))
      .then((data) => {
        if (!ctrl.signal.aborted) setFetched({ q: debouncedQ, data });
      })
      .catch(() => {
        /* aborted or network error: keep prior results visible */
      });
    return () => ctrl.abort();
  }, [debouncedQ]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const activeResults = debouncedQ.length > 0 ? fetched.data : null;
  const loading = debouncedQ.length > 0 && fetched.q !== debouncedQ;

  const items = useMemo<Item[]>(() => {
    const qLower = debouncedQ.toLowerCase();
    const actions = debouncedQ
      ? STATIC_ACTIONS.filter((item) => t(item.labelKey).toLowerCase().includes(qLower))
      : STATIC_ACTIONS;

    const jobs: Item[] = (activeResults?.jobs ?? []).map((job) => ({
      kind: "job" as const,
      id: job.id,
      title: pickLocalized(
        { ru: job.titleRu, uz: job.titleUz, en: job.titleEn },
        locale,
        job.title,
      ),
      status: job.status,
      href: `/hr/jobs/${job.id}`,
    }));

    const candidates: Item[] = (activeResults?.candidates ?? []).map((candidate) => ({
      kind: "candidate" as const,
      id: candidate.id,
      fullName: candidate.fullName,
      jobTitle: candidate.jobTitle,
      matchScore: candidate.matchScore,
      summary: candidate.summary,
      href: `/hr/jobs/${candidate.jobId}/applicants#${candidate.id}`,
    }));

    return [...actions, ...jobs, ...candidates];
  }, [activeResults, debouncedQ, locale, t]);

  const clampedActive = Math.min(activeIndex, Math.max(0, items.length - 1));
  const activeItem = items[clampedActive];

  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [clampedActive]);

  function activate(item: Item, openInNewTab = false) {
    if (openInNewTab) {
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }
    onOpenChange(false);
    router.push(item.href);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((clampedActive + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((clampedActive - 1 + items.length) % items.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = items[clampedActive];
      if (item) activate(item, e.metaKey || e.ctrlKey);
    }
  }

  const grouped = useMemo(
    () => ({
      actions: items.filter((item) => item.kind === "action"),
      jobs: items.filter((item) => item.kind === "job"),
      candidates: items.filter((item) => item.kind === "candidate"),
    }),
    [items],
  );

  return (
    <DialogContent className="p-0 sm:max-w-xl">
      <DialogHeader className="sr-only">
        <DialogTitle>{t("hr.palette.title")}</DialogTitle>
        <DialogDescription>{t("hr.palette.subtitle")}</DialogDescription>
      </DialogHeader>
      <div className="flex items-center gap-2 border-b border-[var(--color-line-strong)] px-4">
        <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("hr.palette.placeholder")}
          className="h-12 flex-1 bg-transparent text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
          aria-label={t("hr.palette.title")}
          aria-autocomplete="list"
          aria-activedescendant={activeItem ? itemDomId(activeItem) : undefined}
        />
        {loading && (
          <span className="text-[11px] text-[var(--color-text-muted)]">{t("hr.palette.loading")}</span>
        )}
      </div>

      <div
        ref={listRef}
        role="listbox"
        className="max-h-[380px] overflow-y-auto p-2 font-[var(--font-sans)]"
      >
        {items.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--color-text-muted)]">
            {debouncedQ ? t("hr.palette.empty_results") : t("hr.palette.empty_hint")}
          </p>
        )}

        <Group label={t("hr.palette.group.actions")} show={grouped.actions.length > 0}>
          {grouped.actions.map((item) => (
            <ActionRow
              key={item.id}
              item={item}
              active={items[clampedActive] === item}
              label={t(item.labelKey)}
              onActivate={activate}
            />
          ))}
        </Group>

        <Group label={t("hr.palette.group.jobs")} show={grouped.jobs.length > 0}>
          {grouped.jobs.map((item) => (
            <JobRow
              key={item.id}
              item={item}
              active={items[clampedActive] === item}
              onActivate={activate}
            />
          ))}
        </Group>

        <Group label={t("hr.palette.group.candidates")} show={grouped.candidates.length > 0}>
          {grouped.candidates.map((item) => (
            <CandidateRow
              key={item.id}
              item={item}
              active={items[clampedActive] === item}
              onActivate={activate}
            />
          ))}
        </Group>
      </div>

      <footer className="flex items-center justify-between border-t border-[var(--color-line-strong)] px-4 py-2 text-[11px] text-[var(--color-text-muted)]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <Kbd>Up</Kbd>
            <Kbd>Down</Kbd>
            <span>{t("hr.palette.hint.navigate")}</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Enter</Kbd>
            <span>{t("hr.palette.hint.open")}</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Ctrl</Kbd>
            <Kbd>Enter</Kbd>
            <span>{t("hr.palette.hint.new_tab")}</span>
          </span>
        </div>
        <CommandIcon className="h-3 w-3" aria-hidden="true" />
      </footer>
    </DialogContent>
  );
}

function itemDomId(item: Item): string {
  return `hr-palette-${item.kind}-${item.id}`;
}

function Group({
  label,
  show,
  children,
}: {
  label: string;
  show: boolean;
  children: React.ReactNode;
}) {
  if (!show) return null;
  return (
    <section className="mb-2">
      <h3 className="px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
        {label}
      </h3>
      <div role="group">{children}</div>
    </section>
  );
}

function Row({
  id,
  active,
  onClick,
  children,
}: {
  id: string;
  active: boolean;
  onClick: (meta: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="option"
      id={id}
      data-active={active ? "true" : "false"}
      aria-selected={active}
      onClick={(e) => onClick(e.metaKey || e.ctrlKey)}
      className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-left text-[13px] text-[var(--color-text)] ${
        active ? "bg-[var(--color-surface-subtle)]" : "hover:bg-[var(--color-surface-subtle)]"
      }`}
    >
      {children}
    </button>
  );
}

function ActionRow({
  item,
  active,
  label,
  onActivate,
}: {
  item: ActionItem;
  active: boolean;
  label: string;
  onActivate: (item: Item, newTab?: boolean) => void;
}) {
  return (
    <Row id={itemDomId(item)} active={active} onClick={(meta) => onActivate(item, meta)}>
      <span className="text-[var(--color-text-muted)]">{item.icon}</span>
      <span className="flex-1">{label}</span>
    </Row>
  );
}

function JobRow({
  item,
  active,
  onActivate,
}: {
  item: JobItem;
  active: boolean;
  onActivate: (item: Item, newTab?: boolean) => void;
}) {
  return (
    <Row id={itemDomId(item)} active={active} onClick={(meta) => onActivate(item, meta)}>
      <Briefcase className="h-4 w-4 text-[var(--color-text-muted)]" />
      <span className="flex-1 truncate">{item.title}</span>
      <StatusDot status={item.status} />
    </Row>
  );
}

function CandidateRow({
  item,
  active,
  onActivate,
}: {
  item: CandidateItem;
  active: boolean;
  onActivate: (item: Item, newTab?: boolean) => void;
}) {
  return (
    <Row id={itemDomId(item)} active={active} onClick={(meta) => onActivate(item, meta)}>
      <UserRound className="h-4 w-4 text-[var(--color-text-muted)]" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{item.fullName}</span>
        <span className="truncate text-[11px] text-[var(--color-text-muted)]">
          {item.summary || item.jobTitle}
        </span>
      </span>
      {item.matchScore != null && (
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-accent-container)] px-1.5 py-0.5 text-[10px] font-[var(--font-mono)] font-semibold text-[var(--color-accent-strong)]">
          {item.matchScore}
        </span>
      )}
    </Row>
  );
}

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "active"
      ? "bg-[var(--color-success)]"
      : status === "closed"
        ? "bg-[var(--color-text-subtle)]"
        : "bg-[var(--color-warning)]";
  return <span className={`h-1.5 w-1.5 rounded-full ${cls}`} aria-hidden="true" />;
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-canvas)] px-1.5 py-0.5 text-[10px] leading-none font-[var(--font-mono)] text-[var(--color-text-muted)]">
      {children}
    </kbd>
  );
}
