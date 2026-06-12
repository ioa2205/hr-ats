"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Settings as SettingsIcon, Users } from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Switch,
  Textarea,
  useToast,
} from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { operatorRoleKey } from "@/lib/operator/enum-labels";

type Tab = "preferences" | "team" | "platform";

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  operator_role: "full" | "read_only";
  updated_at: string;
}

const TAB_KEYS: Record<Tab, TranslationKey> = {
  preferences: "operator.settings.tab.preferences",
  team: "operator.settings.tab.team",
  platform: "operator.settings.tab.platform",
};

export default function SettingsPage() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>("preferences");

  const tabs = useMemo(
    () =>
      [
        { id: "preferences" as const, icon: <SettingsIcon className="h-3.5 w-3.5" /> },
        { id: "team" as const, icon: <Users className="h-3.5 w-3.5" /> },
        { id: "platform" as const, icon: <AlertTriangle className="h-3.5 w-3.5" /> },
      ],
    [],
  );

  return (
    <div className="flex flex-col gap-4 font-[var(--font-sans)]">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          {t("operator.settings.eyebrow")}
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-text)]">
          {t("operator.nav.settings")}
        </h1>
      </header>

      <nav className="flex items-center gap-1 overflow-x-auto border-b border-[var(--color-line)] pb-1">
        {tabs.map(({ id, icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] font-medium transition-colors ${
                active
                  ? "bg-[var(--color-text)] text-[var(--color-canvas)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
              }`}
            >
              {icon}
              {t(TAB_KEYS[id])}
            </button>
          );
        })}
      </nav>

      {tab === "preferences" && <PreferencesTab />}
      {tab === "team" && <TeamTab />}
      {tab === "platform" && <PlatformTab />}
    </div>
  );
}

/**
 * Shared reason-capture dialog. Operator role changes and platform-setting
 * edits are audited, so each requires a free-text reason (≥10 chars) before the
 * write is sent — replacing the old jarring `window.prompt`.
 */
function ReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  busy,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: (reason: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* Mount the field only while open so each invocation starts blank —
            same per-session reset trick the command palette uses. */}
        {open && (
          <ReasonForm
            confirmLabel={confirmLabel}
            busy={busy}
            onConfirm={onConfirm}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReasonForm({
  confirmLabel,
  busy,
  onConfirm,
  onCancel,
}: {
  confirmLabel: string;
  busy: boolean;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= 10;

  return (
    <>
      <div className="px-6 py-2">
        <Textarea
          label={t("operator.settings.reason_label")}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t("operator.settings.reason_placeholder")}
          rows={3}
          autoFocus
        />
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button loading={busy} disabled={!valid} onClick={() => onConfirm(reason.trim())}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

function PreferencesTab() {
  const { t } = useTranslation();
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] p-5">
      <h2 className="mb-1 text-[14px] font-semibold text-[var(--color-text)]">
        {t("operator.settings.prefs_title")}
      </h2>
      <p className="text-[12px] text-[var(--color-text-muted)]">
        {t("operator.settings.prefs_help")}
      </p>
    </section>
  );
}

function TeamTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [roleChange, setRoleChange] = useState<{
    member: TeamMember;
    next: "full" | "read_only";
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/team", { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { data: TeamMember[] };
        setMembers(j.data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function changeRole(reason: string) {
    if (!roleChange) return;
    const { member, next } = roleChange;
    setBusyId(member.id);
    try {
      const res = await fetch("/api/operator/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: member.id, operatorRole: next, reason }),
      });
      if (res.ok) {
        toast({ variant: "success", title: t("operator.settings.role_updated") });
        setRoleChange(null);
        await load();
      } else {
        const j = await res.json().catch(() => ({}));
        toast({ variant: "error", title: j?.error ?? t("operator.settings.role_failed") });
      }
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="h-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)]" />
    );
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)]">
      <header className="border-b border-[var(--color-line-strong)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {t("operator.settings.team_title", { n: String(members.length) })}
      </header>
      <ul className="divide-y divide-[var(--color-line)]">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]"
          >
            <div className="flex flex-col">
              <span className="font-medium text-[var(--color-text)]">
                {m.full_name ?? m.email}
              </span>
              {m.full_name && (
                <span className="text-[11px] text-[var(--color-text-muted)]">{m.email}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={m.operator_role === "read_only" ? "neutral" : "accent"} size="sm">
                {t(operatorRoleKey(m.operator_role))}
              </Badge>
              <Button
                variant="secondary"
                size="sm"
                loading={busyId === m.id}
                onClick={() =>
                  setRoleChange({
                    member: m,
                    next: m.operator_role === "full" ? "read_only" : "full",
                  })
                }
              >
                {m.operator_role === "full"
                  ? t("operator.settings.restrict")
                  : t("operator.settings.grant")}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className="px-4 py-2 text-[10px] text-[var(--color-text-subtle)]">
        {t("operator.settings.team_note")}
      </p>

      <ReasonDialog
        open={roleChange !== null}
        onOpenChange={(open) => {
          if (!open) setRoleChange(null);
        }}
        title={t("operator.settings.role_dialog_title")}
        description={
          roleChange
            ? t("operator.settings.role_prompt", {
                email: roleChange.member.email,
                next: t(operatorRoleKey(roleChange.next)),
              })
            : ""
        }
        confirmLabel={
          roleChange?.next === "read_only"
            ? t("operator.settings.restrict")
            : t("operator.settings.grant")
        }
        busy={busyId !== null}
        onConfirm={changeRole}
      />
    </section>
  );
}

const PLATFORM_FIELDS: Array<{
  key: string;
  labelKey: TranslationKey;
  helpKey: TranslationKey;
  type: "toggle" | "number" | "text";
}> = [
  {
    key: "maintenance_mode",
    labelKey: "operator.settings.field.maintenance_label",
    helpKey: "operator.settings.field.maintenance_help",
    type: "toggle",
  },
  {
    key: "signup_paused",
    labelKey: "operator.settings.field.signup_label",
    helpKey: "operator.settings.field.signup_help",
    type: "toggle",
  },
  {
    key: "gemini_model",
    labelKey: "operator.settings.field.gemini_label",
    helpKey: "operator.settings.field.gemini_help",
    type: "text",
  },
  {
    key: "trial_length_days",
    labelKey: "operator.settings.field.trial_length_label",
    helpKey: "operator.settings.field.trial_length_help",
    type: "number",
  },
  {
    key: "default_cv_quota",
    labelKey: "operator.settings.field.cv_quota_label",
    helpKey: "operator.settings.field.cv_quota_help",
    type: "number",
  },
  {
    key: "default_job_quota",
    labelKey: "operator.settings.field.job_quota_label",
    helpKey: "operator.settings.field.job_quota_help",
    type: "number",
  },
  {
    key: "default_sourcing_quota",
    labelKey: "operator.settings.field.sourcing_quota_label",
    helpKey: "operator.settings.field.sourcing_quota_help",
    type: "number",
  },
  {
    key: "sourcing_max_fetched",
    labelKey: "operator.settings.field.sourcing_max_fetched_label",
    helpKey: "operator.settings.field.sourcing_max_fetched_help",
    type: "number",
  },
  {
    key: "sourcing_max_pro_calls",
    labelKey: "operator.settings.field.sourcing_max_pro_calls_label",
    helpKey: "operator.settings.field.sourcing_max_pro_calls_help",
    type: "number",
  },
  {
    key: "sourcing_shortlist_size",
    labelKey: "operator.settings.field.sourcing_shortlist_label",
    helpKey: "operator.settings.field.sourcing_shortlist_help",
    type: "number",
  },
];

function PlatformTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/settings", { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { settings: Record<string, string> };
        setValues(j.settings ?? {});
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(key: string, reason: string) {
    const value = edited[key] ?? values[key] ?? "";
    setSavingKey(key);
    try {
      const res = await fetch("/api/operator/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, reason }),
      });
      if (res.ok) {
        toast({ variant: "success", title: t("operator.settings.saved") });
        setConfirmKey(null);
        setEdited((e) => {
          const next = { ...e };
          delete next[key];
          return next;
        });
        await load();
      } else {
        const j = await res.json().catch(() => ({}));
        toast({ variant: "error", title: j?.error ?? t("operator.settings.save_failed") });
      }
    } finally {
      setSavingKey(null);
    }
  }

  if (loading) {
    return <div className="h-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-surface-subtle)]" />;
  }

  const confirmValue = confirmKey ? (edited[confirmKey] ?? values[confirmKey] ?? "") : "";

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)]">
      <header className="border-b border-[var(--color-line-strong)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        {t("operator.settings.platform_title")}
      </header>
      <ul className="divide-y divide-[var(--color-line)]">
        {PLATFORM_FIELDS.map((f) => {
          const current = edited[f.key] ?? values[f.key] ?? "";
          const dirty = edited[f.key] !== undefined && edited[f.key] !== values[f.key];
          const saving = savingKey === f.key;
          return (
            <li key={f.key} className="flex items-center gap-3 p-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-medium text-[var(--color-text)]">
                  {t(f.labelKey)}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">{t(f.helpKey)}</span>
              </div>
              <div className="flex items-center gap-2">
                {f.type === "toggle" ? (
                  <Switch
                    checked={current === "true"}
                    onCheckedChange={(v) =>
                      setEdited((prev) => ({ ...prev, [f.key]: v ? "true" : "false" }))
                    }
                    aria-label={t(f.labelKey)}
                  />
                ) : (
                  <div className="w-32">
                    <Input
                      value={current}
                      onChange={(e) => setEdited((v) => ({ ...v, [f.key]: e.target.value }))}
                      type={f.type === "number" ? "number" : "text"}
                      min={f.type === "number" ? 0 : undefined}
                      aria-label={t(f.labelKey)}
                    />
                  </div>
                )}
                <Button
                  size="sm"
                  disabled={!dirty || saving}
                  loading={saving}
                  onClick={() => setConfirmKey(f.key)}
                >
                  {t("operator.settings.save")}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <ReasonDialog
        open={confirmKey !== null}
        onOpenChange={(open) => {
          if (!open) setConfirmKey(null);
        }}
        title={t("operator.settings.save_dialog_title")}
        description={
          confirmKey
            ? t("operator.settings.save_prompt", { key: confirmKey, value: confirmValue })
            : ""
        }
        confirmLabel={t("operator.settings.save")}
        busy={savingKey !== null}
        onConfirm={(reason) => confirmKey && save(confirmKey, reason)}
      />
    </section>
  );
}
