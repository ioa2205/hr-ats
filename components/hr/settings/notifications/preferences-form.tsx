"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader, PanelTitle, SectionH, TezButton, Seg } from "@/components/hr/design";
import { useTranslation } from "@/lib/i18n/provider";
import type { Database } from "@/types/supabase";
import type { TranslationKey } from "@/lib/i18n/types";

type Prefs = Database["public"]["Tables"]["notification_preferences"]["Row"];
type EditablePrefs = Omit<Prefs, "id" | "user_id" | "company_id" | "created_at" | "updated_at">;

type EventRow = {
  id: string;
  emailKey: keyof EditablePrefs;
  inappKey: keyof EditablePrefs | null;
  labelKey: TranslationKey;
  descKey: TranslationKey;
};

const PIPELINE: EventRow[] = [
  {
    id: "new_application",
    emailKey: "email_new_application",
    inappKey: "inapp_new_application",
    labelKey: "hr.settings.notifications.event.new_application",
    descKey: "hr.settings.notifications.event.new_application_desc",
  },
  {
    id: "top_pick",
    emailKey: "email_top_pick",
    inappKey: "inapp_top_pick",
    labelKey: "hr.settings.notifications.event.top_pick",
    descKey: "hr.settings.notifications.event.top_pick_desc",
  },
];

const INTERVIEWS: EventRow[] = [
  {
    id: "interview_booked",
    emailKey: "email_interview_booked",
    inappKey: "inapp_interview_booked",
    labelKey: "hr.settings.notifications.event.interview_booked",
    descKey: "hr.settings.notifications.event.interview_booked_desc",
  },
  {
    id: "interview_declined",
    emailKey: "email_interview_declined",
    inappKey: "inapp_interview_declined",
    labelKey: "hr.settings.notifications.event.interview_declined",
    descKey: "hr.settings.notifications.event.interview_declined_desc",
  },
];

const SYSTEM: EventRow[] = [
  {
    id: "quota_warning",
    emailKey: "email_quota_warning",
    inappKey: null,
    labelKey: "hr.settings.notifications.event.quota_warning",
    descKey: "hr.settings.notifications.event.quota_warning_desc",
  },
  {
    id: "ai_failed",
    emailKey: "email_weekly_digest",
    inappKey: "inapp_ai_failed",
    labelKey: "hr.settings.notifications.event.ai_failed",
    descKey: "hr.settings.notifications.event.ai_failed_desc",
  },
  {
    id: "weekly_digest",
    emailKey: "email_weekly_digest",
    inappKey: null,
    labelKey: "hr.settings.notifications.event.weekly_digest",
    descKey: "hr.settings.notifications.event.weekly_digest_desc",
  },
];

const DIGEST_HOURS = [8, 9, 10] as const;

export function PreferencesForm({ initial }: { initial: Prefs }) {
  const { t } = useTranslation();
  const [state, setState] = useState<EditablePrefs>(toEditable(initial));
  const [saved, setSaved] = useState<EditablePrefs>(toEditable(initial));
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "ok">("idle");

  const dirty = useMemo(() => !shallowEq(state, saved), [state, saved]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const patch = useCallback((update: Partial<EditablePrefs>) => {
    setState((prev) => ({ ...prev, ...update }));
  }, []);

  const save = useCallback(async () => {
    setStatus("saving");
    try {
      const res = await fetch("/api/hr/notifications/preferences", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(state),
      });
      if (!res.ok) throw new Error(String(res.status));
      const next = (await res.json()) as Prefs;
      const nextEditable = toEditable(next);
      setSaved(nextEditable);
      setState(nextEditable);
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("error");
    }
  }, [state]);

  const discard = useCallback(() => {
    setState(saved);
    setStatus("idle");
  }, [saved]);

  const renderRow = (row: EventRow) => (
    <div
      key={row.id}
      className="border-rule grid grid-cols-[1fr_auto] items-start gap-6 border-t px-[18px] py-3 first:border-t-0"
    >
      <div className="min-w-0">
        <div className="text-ink text-[13.5px] font-semibold">{t(row.labelKey)}</div>
        <div className="text-ink-4 mt-0.5 text-[12px] leading-[1.5]">{t(row.descKey)}</div>
      </div>
      <div className="flex items-center gap-6 pt-1">
        <ChannelToggle
          label={t("hr.settings.notifications.channel.email")}
          on={state[row.emailKey] as boolean}
          onChange={(v) => patch({ [row.emailKey]: v } as Partial<EditablePrefs>)}
        />
        {row.inappKey ? (
          <ChannelToggle
            label={t("hr.settings.notifications.channel.inapp")}
            on={state[row.inappKey] as boolean}
            onChange={(v) =>
              patch({ [row.inappKey as keyof EditablePrefs]: v } as Partial<EditablePrefs>)
            }
          />
        ) : (
          <div className="w-[64px]" aria-hidden />
        )}
      </div>
    </div>
  );

  return (
    <>
      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.notifications.group.pipeline")}</PanelTitle>
        </PanelHeader>
        {PIPELINE.map(renderRow)}
      </Panel>

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.notifications.group.interviews")}</PanelTitle>
        </PanelHeader>
        {INTERVIEWS.map(renderRow)}
      </Panel>

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.notifications.group.system")}</PanelTitle>
        </PanelHeader>
        {SYSTEM.map(renderRow)}
      </Panel>

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.notifications.cadence.title")}</PanelTitle>
        </PanelHeader>
        <div className="space-y-5 p-[18px]">
          <div>
            <SectionH title={t("hr.settings.notifications.cadence.digest_label")} />
            <Seg
              value={String(state.digest_hour)}
              options={DIGEST_HOURS.map((h) => ({
                value: String(h),
                label: `${String(h).padStart(2, "0")}:00`,
              }))}
              onChange={(v) => patch({ digest_hour: Number(v) })}
            />
            <p className="text-ink-5 mt-2 text-[11.5px]">
              {t("hr.settings.notifications.cadence.digest_hint")}
            </p>
          </div>

          <div>
            <SectionH title={t("hr.settings.notifications.cadence.quiet_label")} />
            <div className="flex items-center gap-2">
              <HourSelect
                ariaLabel={t("hr.settings.notifications.cadence.quiet_start")}
                value={state.quiet_hours_start}
                onChange={(v) => patch({ quiet_hours_start: v })}
                offLabel={t("hr.settings.notifications.cadence.quiet_off")}
              />
              <span className="text-ink-5 text-[11.5px]">→</span>
              <HourSelect
                ariaLabel={t("hr.settings.notifications.cadence.quiet_end")}
                value={state.quiet_hours_end}
                onChange={(v) => patch({ quiet_hours_end: v })}
                offLabel={t("hr.settings.notifications.cadence.quiet_off")}
              />
            </div>
            <p className="text-ink-5 mt-2 text-[11.5px]">
              {t("hr.settings.notifications.cadence.quiet_hint")}
            </p>
          </div>
        </div>
      </Panel>

      <SaveBar
        dirty={dirty}
        status={status}
        onSave={save}
        onDiscard={discard}
        labels={{
          save: t("hr.settings.notifications.save"),
          discard: t("hr.settings.notifications.discard"),
          unsaved: t("hr.settings.notifications.unsaved_warn"),
          saved: t("hr.settings.notifications.saved"),
          error: t("hr.settings.notifications.save_error"),
        }}
      />
    </>
  );
}

function ChannelToggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2">
      <span className="text-ink-4 w-12 text-right text-[11.5px]">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={cn(
          "relative inline-flex h-4 w-7 shrink-0 items-center rounded-[8px] border transition-colors",
          on ? "bg-ink border-ink" : "bg-bone-3 border-rule-2",
        )}
      >
        <span
          className="bg-paper absolute top-[1px] h-3 w-3 rounded-full shadow-sm transition-[left]"
          style={{ left: on ? 14 : 1 }}
        />
      </button>
    </label>
  );
}

function HourSelect({
  value,
  onChange,
  offLabel,
  ariaLabel,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  offLabel: string;
  ariaLabel: string;
}) {
  const raw = value == null ? "" : String(value);
  return (
    <select
      aria-label={ariaLabel}
      value={raw}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      className="border-rule-2 bg-paper text-ink h-[30px] rounded-[4px] border px-2 text-[12.5px]"
      style={{ fontFamily: "var(--font-tez-mono)" }}
    >
      <option value="">{offLabel}</option>
      {Array.from({ length: 24 }, (_, h) => (
        <option key={h} value={h}>
          {String(h).padStart(2, "0")}:00
        </option>
      ))}
    </select>
  );
}

function SaveBar({
  dirty,
  status,
  onSave,
  onDiscard,
  labels,
}: {
  dirty: boolean;
  status: "idle" | "saving" | "error" | "ok";
  onSave: () => void;
  onDiscard: () => void;
  labels: { save: string; discard: string; unsaved: string; saved: string; error: string };
}) {
  if (!dirty && status !== "ok" && status !== "error") return null;

  return (
    <div className="sticky bottom-3 z-10">
      <div className="border-rule bg-paper shadow-tez-2 flex items-center justify-between gap-3 rounded-[6px] border px-4 py-2.5">
        <div className="flex items-center gap-2 text-[12.5px]">
          {status === "ok" ? (
            <span className="text-tez-green font-medium">✓ {labels.saved}</span>
          ) : status === "error" ? (
            <span className="text-tez-red font-medium">{labels.error}</span>
          ) : (
            <span className="text-ink-4">{labels.unsaved}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TezButton
            variant="ghost"
            size="sm"
            onClick={onDiscard}
            disabled={!dirty || status === "saving"}
          >
            {labels.discard}
          </TezButton>
          <TezButton
            variant="accent"
            size="sm"
            onClick={onSave}
            disabled={!dirty || status === "saving"}
          >
            {labels.save}
          </TezButton>
        </div>
      </div>
    </div>
  );
}

function toEditable(p: Prefs): EditablePrefs {
  const {
    email_new_application,
    email_top_pick,
    email_interview_booked,
    email_interview_declined,
    email_quota_warning,
    email_weekly_digest,
    inapp_new_application,
    inapp_top_pick,
    inapp_interview_booked,
    inapp_interview_declined,
    inapp_ai_failed,
    digest_hour,
    quiet_hours_start,
    quiet_hours_end,
  } = p;
  return {
    email_new_application,
    email_top_pick,
    email_interview_booked,
    email_interview_declined,
    email_quota_warning,
    email_weekly_digest,
    inapp_new_application,
    inapp_top_pick,
    inapp_interview_booked,
    inapp_interview_declined,
    inapp_ai_failed,
    digest_hour,
    quiet_hours_start,
    quiet_hours_end,
  };
}

function shallowEq(a: EditablePrefs, b: EditablePrefs): boolean {
  const keys = Object.keys(a) as (keyof EditablePrefs)[];
  return keys.every((k) => a[k] === b[k]);
}
