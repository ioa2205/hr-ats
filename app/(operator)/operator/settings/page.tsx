"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Settings as SettingsIcon, Users } from "lucide-react";
import { useToast } from "@/components/ui";
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
    <div className="flex flex-col gap-4 font-[var(--font-tez-sans)]">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
          {t("operator.settings.eyebrow")}
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--color-ink)]">
          {t("operator.nav.settings")}
        </h1>
      </header>

      <nav className="flex items-center gap-1 overflow-x-auto border-b border-[var(--color-rule)] pb-1">
        {tabs.map(({ id, icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-sm)] px-2.5 py-1 text-[12px] font-medium transition-colors ${
                active
                  ? "bg-[var(--color-ink)] text-[var(--color-bone)]"
                  : "text-[var(--color-ink-4)] hover:bg-[var(--color-bone-2)] hover:text-[var(--color-ink)]"
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

function PreferencesTab() {
  const { t } = useTranslation();
  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)] p-5">
      <h2 className="mb-1 text-[14px] font-semibold text-[var(--color-ink)]">
        {t("operator.settings.prefs_title")}
      </h2>
      <p className="text-[12px] text-[var(--color-ink-4)]">
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

  async function changeRole(m: TeamMember, next: "full" | "read_only") {
    const reason = window.prompt(
      t("operator.settings.role_prompt", { email: m.email, next }),
      "",
    );
    if (!reason || reason.trim().length < 10) return;
    setBusyId(m.id);
    try {
      const res = await fetch("/api/operator/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: m.id, operatorRole: next, reason }),
      });
      if (res.ok) {
        toast({ variant: "success", title: t("operator.settings.role_updated") });
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
      <div className="h-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-bone-2)]" />
    );
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)]">
      <header className="border-b border-[var(--color-rule-2)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
        {t("operator.settings.team_title", { n: String(members.length) })}
      </header>
      <ul className="divide-y divide-[var(--color-rule)]">
        {members.map((m) => (
          <li
            key={m.id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]"
          >
            <div className="flex flex-col">
              <span className="font-medium text-[var(--color-ink)]">
                {m.full_name ?? m.email}
              </span>
              {m.full_name && (
                <span className="text-[11px] text-[var(--color-ink-4)]">{m.email}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                  m.operator_role === "read_only"
                    ? "bg-[var(--color-bone-2)] text-[var(--color-ink-4)]"
                    : "bg-[var(--color-persimmon-tint)] text-[var(--color-persimmon-2)]"
                }`}
              >
                {t(operatorRoleKey(m.operator_role))}
              </span>
              <button
                type="button"
                disabled={busyId === m.id}
                onClick={() =>
                  changeRole(m, m.operator_role === "full" ? "read_only" : "full")
                }
                className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-bone)] px-2.5 text-[12px] font-medium text-[var(--color-ink-3)] hover:bg-[var(--color-bone-2)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busyId === m.id
                  ? "…"
                  : m.operator_role === "full"
                    ? t("operator.settings.restrict")
                    : t("operator.settings.grant")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <p className="px-4 py-2 text-[10px] text-[var(--color-ink-5)]">
        {t("operator.settings.team_note")}
      </p>
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
];

function PlatformTab() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

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

  async function save(key: string) {
    const value = edited[key] ?? values[key] ?? "";
    const reason = window.prompt(t("operator.settings.save_prompt", { key, value }), "");
    if (!reason || reason.trim().length < 10) return;
    setSavingKey(key);
    try {
      const res = await fetch("/api/operator/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value, reason }),
      });
      if (res.ok) {
        toast({ variant: "success", title: t("operator.settings.saved") });
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
    return <div className="h-24 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-bone-2)]" />;
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)]">
      <header className="border-b border-[var(--color-rule-2)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
        {t("operator.settings.platform_title")}
      </header>
      <ul className="divide-y divide-[var(--color-rule)]">
        {PLATFORM_FIELDS.map((f) => {
          const current = edited[f.key] ?? values[f.key] ?? "";
          const dirty = edited[f.key] !== undefined && edited[f.key] !== values[f.key];
          const saving = savingKey === f.key;
          const inputCls =
            "h-8 w-44 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-bone)] px-2 text-[12px] text-[var(--color-ink)] placeholder:text-[var(--color-ink-5)] focus:border-[var(--color-ink-3)] focus:outline-none";
          return (
            <li key={f.key} className="flex items-center gap-3 p-3">
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-[13px] font-medium text-[var(--color-ink)]">
                  {t(f.labelKey)}
                </span>
                <span className="text-[11px] text-[var(--color-ink-4)]">{t(f.helpKey)}</span>
              </div>
              <div className="flex items-center gap-2">
                {f.type === "toggle" ? (
                  <select
                    value={current === "true" ? "true" : "false"}
                    onChange={(e) =>
                      setEdited((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                    className="h-8 rounded-[var(--radius-sm)] border border-[var(--color-rule-2)] bg-[var(--color-bone)] px-2 text-[12px] text-[var(--color-ink)] focus:border-[var(--color-ink-3)] focus:outline-none"
                  >
                    <option value="false">{t("operator.settings.off")}</option>
                    <option value="true">{t("operator.settings.on")}</option>
                  </select>
                ) : f.type === "number" ? (
                  <input
                    value={current}
                    onChange={(e) => setEdited((v) => ({ ...v, [f.key]: e.target.value }))}
                    type="number"
                    min={0}
                    className={inputCls}
                  />
                ) : (
                  <input
                    value={current}
                    onChange={(e) => setEdited((v) => ({ ...v, [f.key]: e.target.value }))}
                    type="text"
                    className={inputCls}
                  />
                )}
                <button
                  type="button"
                  disabled={!dirty || saving}
                  onClick={() => save(f.key)}
                  className="flex h-8 items-center rounded-[var(--radius-sm)] bg-[var(--color-persimmon-2)] px-3 text-[12px] font-medium text-white hover:bg-[var(--color-persimmon)] disabled:cursor-not-allowed disabled:bg-[var(--color-bone-3)] disabled:text-[var(--color-ink-5)]"
                >
                  {saving ? "…" : t("operator.settings.save")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
