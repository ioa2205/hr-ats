"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Command as CommandIcon,
  Inbox,
  LayoutDashboard,
  Search,
  User,
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
import type { SearchResponse } from "@/lib/operator/search-schema";
import type { TranslationKey } from "@/lib/i18n/types";
import { companyStatusKey } from "@/lib/operator/enum-labels";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Item =
  | { kind: "action"; id: string; labelKey: TranslationKey; href: string; icon: React.ReactNode }
  | {
      kind: "company";
      id: string;
      name: string;
      slug: string;
      status: string;
      href: string;
    }
  | {
      kind: "user";
      id: string;
      email: string;
      fullName: string | null;
      isOperator: boolean;
      href: string;
    }
  | {
      kind: "audit";
      id: number;
      action: string;
      actor: string | null;
      createdAt: string;
      href: string;
    };

const STATIC_ACTIONS: Array<Extract<Item, { kind: "action" }>> = [
  {
    kind: "action",
    id: "go-dashboard",
    labelKey: "operator.palette.jump_dashboard",
    href: "/operator",
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    kind: "action",
    id: "go-companies",
    labelKey: "operator.palette.jump_companies",
    href: "/operator/companies",
    icon: <Building2 className="h-4 w-4" />,
  },
  {
    kind: "action",
    id: "go-users",
    labelKey: "operator.palette.jump_users",
    href: "/operator/users",
    icon: <Users className="h-4 w-4" />,
  },
  {
    kind: "action",
    id: "go-inbox",
    labelKey: "operator.palette.jump_inbox",
    href: "/operator/inbox",
    icon: <Inbox className="h-4 w-4" />,
  },
  {
    kind: "action",
    id: "go-audit",
    labelKey: "operator.palette.jump_audit",
    href: "/operator/audit",
    icon: <ClipboardList className="h-4 w-4" />,
  },
];

export function CommandPalette({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mounting PaletteContent only while the dialog is open gives us
          per-session state reset for free — no setState-in-effect gymnastics. */}
      {open && <PaletteContent onOpenChange={onOpenChange} />}
    </Dialog>
  );
}

function PaletteContent({ onOpenChange }: { onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [fetched, setFetched] = useState<{ q: string; data: SearchResponse | null }>({
    q: "",
    data: null,
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Debounce query input by 150ms
  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(q.trim()), 150);
    return () => window.clearTimeout(id);
  }, [q]);

  // Fetch search results. All setState calls live inside async callbacks, so
  // the React Compiler treats this as a legitimate external-state sync.
  useEffect(() => {
    if (debouncedQ.length === 0) return;
    const ctrl = new AbortController();
    fetch(`/api/operator/search?q=${encodeURIComponent(debouncedQ)}`, {
      signal: ctrl.signal,
      cache: "no-store",
    })
      .then((res) => (res.ok ? (res.json() as Promise<SearchResponse>) : null))
      .then((data) => {
        if (ctrl.signal.aborted) return;
        setFetched({ q: debouncedQ, data });
      })
      .catch(() => {
        /* aborted or network error — leave prior results in place */
      });
    return () => ctrl.abort();
  }, [debouncedQ]);

  // Focus the input after the first paint.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Effective results — only show when a query is active.
  const activeResults = debouncedQ.length > 0 ? fetched.data : null;
  const loading = debouncedQ.length > 0 && fetched.q !== debouncedQ;

  const items = useMemo<Item[]>(() => {
    const qLower = debouncedQ.toLowerCase();
    const filteredActions = debouncedQ
      ? STATIC_ACTIONS.filter((a) => t(a.labelKey).toLowerCase().includes(qLower))
      : STATIC_ACTIONS;

    const companies: Item[] = (activeResults?.companies ?? []).map((c) => ({
      kind: "company" as const,
      id: c.id,
      name: c.name,
      slug: c.slug,
      status: c.status,
      href: `/operator/companies/${c.id}`,
    }));

    const users: Item[] = (activeResults?.users ?? []).map((u) => ({
      kind: "user" as const,
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      isOperator: u.isOperator,
      href: `/operator/users?q=${encodeURIComponent(u.email)}`,
    }));

    const audit: Item[] = (activeResults?.audit ?? []).map((a) => ({
      kind: "audit" as const,
      id: a.id,
      action: a.action,
      actor: a.actor,
      createdAt: a.createdAt,
      href: `/operator/audit`,
    }));

    return [...filteredActions, ...companies, ...users, ...audit];
  }, [debouncedQ, activeResults, t]);

  // Clamp at render — never store a stale index in state.
  const clampedActive = Math.min(activeIndex, Math.max(0, items.length - 1));

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

  const grouped = useMemo(() => {
    return {
      actionItems: items.filter((i) => i.kind === "action"),
      companyItems: items.filter((i) => i.kind === "company"),
      userItems: items.filter((i) => i.kind === "user"),
      auditItems: items.filter((i) => i.kind === "audit"),
    };
  }, [items]);

  const activeItem = items[clampedActive];

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>("[data-active='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [clampedActive]);

  return (
    <DialogContent className="p-0 sm:max-w-xl">
      <DialogHeader className="sr-only">
        <DialogTitle>{t("operator.palette.title")}</DialogTitle>
        <DialogDescription>{t("operator.palette.subtitle")}</DialogDescription>
      </DialogHeader>
      <div className="flex items-center gap-2 border-b border-[var(--color-rule-2)] px-4">
        <Search className="h-4 w-4 shrink-0 text-[var(--color-ink-4)]" aria-hidden="true" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("operator.palette.placeholder")}
          className="h-12 flex-1 bg-transparent text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink-5)] outline-none"
          aria-label={t("operator.palette.title")}
          aria-autocomplete="list"
          aria-activedescendant={activeItem ? itemDomId(activeItem) : undefined}
        />
        {loading && (
          <span className="text-[11px] text-[var(--color-ink-4)]">
            {t("operator.palette.loading")}
          </span>
        )}
      </div>

      <div
        ref={listRef}
        role="listbox"
        className="max-h-[380px] overflow-y-auto p-2 font-[var(--font-tez-sans)]"
      >
        {items.length === 0 && (
          <p className="p-6 text-center text-sm text-[var(--color-ink-4)]">
            {debouncedQ
              ? t("operator.palette.empty_results")
              : t("operator.palette.empty_hint")}
          </p>
        )}

        <Group label={t("operator.palette.group.actions")} show={grouped.actionItems.length > 0}>
          {grouped.actionItems.map((item) => (
            <ActionRow
              key={item.id}
              item={item}
              active={items[clampedActive] === item}
              onActivate={activate}
              label={t(item.labelKey)}
            />
          ))}
        </Group>

        <Group label={t("operator.palette.group.companies")} show={grouped.companyItems.length > 0}>
          {grouped.companyItems.map((item) => (
            <CompanyRow
              key={item.id}
              item={item}
              active={items[clampedActive] === item}
              onActivate={activate}
            />
          ))}
        </Group>

        <Group label={t("operator.palette.group.users")} show={grouped.userItems.length > 0}>
          {grouped.userItems.map((item) => (
            <UserRow
              key={item.id}
              item={item}
              active={items[clampedActive] === item}
              onActivate={activate}
              opLabel={t("operator.palette.user_operator_badge")}
            />
          ))}
        </Group>

        <Group label={t("operator.palette.group.audit")} show={grouped.auditItems.length > 0}>
          {grouped.auditItems.map((item) => (
            <AuditRow
              key={item.id}
              item={item}
              active={items[clampedActive] === item}
              onActivate={activate}
            />
          ))}
        </Group>
      </div>

      <footer className="flex items-center justify-between border-t border-[var(--color-rule-2)] px-4 py-2 text-[11px] text-[var(--color-ink-4)]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd>
            <span>{t("operator.palette.hint.navigate")}</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd>
            <span>{t("operator.palette.hint.open")}</span>
          </span>
          <span className="flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>↵</Kbd>
            <span>{t("operator.palette.hint.new_tab")}</span>
          </span>
        </div>
        <CommandIcon className="h-3 w-3" aria-hidden="true" />
      </footer>
    </DialogContent>
  );
}

function itemDomId(item: Item): string {
  return `palette-item-${item.kind}-${"id" in item ? item.id : ""}`;
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
      <h3 className="px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-[var(--color-ink-5)] uppercase">
        {label}
      </h3>
      <div role="group">{children}</div>
    </section>
  );
}

function Row({
  active,
  onClick,
  id,
  children,
}: {
  active: boolean;
  onClick: (meta: boolean) => void;
  id: string;
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
      className={`flex w-full items-center gap-3 rounded-[var(--radius-sm)] px-2 py-2 text-left text-[13px] text-[var(--color-ink)] ${
        active ? "bg-[var(--color-bone-2)]" : "hover:bg-[var(--color-bone-2)]"
      }`}
    >
      {children}
    </button>
  );
}

function ActionRow({
  item,
  active,
  onActivate,
  label,
}: {
  item: Extract<Item, { kind: "action" }>;
  active: boolean;
  onActivate: (i: Item, newTab?: boolean) => void;
  label: string;
}) {
  return (
    <Row
      active={active}
      id={itemDomId(item)}
      onClick={(meta) => onActivate(item, meta)}
    >
      <span className="text-[var(--color-ink-4)]">{item.icon}</span>
      <span className="flex-1">{label}</span>
    </Row>
  );
}

function CompanyRow({
  item,
  active,
  onActivate,
}: {
  item: Extract<Item, { kind: "company" }>;
  active: boolean;
  onActivate: (i: Item, newTab?: boolean) => void;
}) {
  const { t } = useTranslation();
  const statusLabel = t(companyStatusKey(item.status));
  return (
    <Row active={active} id={itemDomId(item)} onClick={(meta) => onActivate(item, meta)}>
      <Building2 className="h-4 w-4 text-[var(--color-ink-4)]" />
      <span className="flex-1 truncate">{item.name}</span>
      <span className="font-[var(--font-tez-mono)] text-[11px] text-[var(--color-ink-5)]">
        {item.slug}
      </span>
      <StatusDot status={item.status} label={statusLabel} />
    </Row>
  );
}

function UserRow({
  item,
  active,
  onActivate,
  opLabel,
}: {
  item: Extract<Item, { kind: "user" }>;
  active: boolean;
  onActivate: (i: Item, newTab?: boolean) => void;
  opLabel: string;
}) {
  return (
    <Row active={active} id={itemDomId(item)} onClick={(meta) => onActivate(item, meta)}>
      <User className="h-4 w-4 text-[var(--color-ink-4)]" />
      <span className="flex flex-1 flex-col truncate">
        <span className="truncate">{item.fullName ?? item.email}</span>
        {item.fullName && (
          <span className="truncate text-[11px] text-[var(--color-ink-4)]">{item.email}</span>
        )}
      </span>
      {item.isOperator && (
        <span className="rounded-[var(--radius-sm)] bg-[var(--color-persimmon-tint)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-persimmon-2)]">
          {opLabel}
        </span>
      )}
    </Row>
  );
}

function AuditRow({
  item,
  active,
  onActivate,
}: {
  item: Extract<Item, { kind: "audit" }>;
  active: boolean;
  onActivate: (i: Item, newTab?: boolean) => void;
}) {
  return (
    <Row active={active} id={itemDomId(item)} onClick={(meta) => onActivate(item, meta)}>
      <ClipboardList className="h-4 w-4 text-[var(--color-ink-4)]" />
      <span className="flex flex-1 flex-col truncate">
        <span className="font-[var(--font-tez-mono)] text-[12px] truncate">{item.action}</span>
        <span className="text-[11px] text-[var(--color-ink-4)]">
          {item.actor ?? "system"} · {new Date(item.createdAt).toLocaleString()}
        </span>
      </span>
    </Row>
  );
}

function StatusDot({ status, label }: { status: string; label: string }) {
  const cls =
    status === "active"
      ? "bg-[var(--color-tez-green)]"
      : status === "suspended"
        ? "bg-[var(--color-tez-red)]"
        : "bg-[var(--color-ink-5)]";
  return (
    <span
      className={`h-1.5 w-1.5 rounded-full ${cls}`}
      title={label}
      aria-label={label}
    />
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="font-[var(--font-tez-mono)] rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-bone)] px-1.5 py-0.5 text-[10px] leading-none text-[var(--color-ink-3)]">
      {children}
    </kbd>
  );
}
