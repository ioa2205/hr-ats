"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@/components/ui";
import { SettingsSaveBar } from "@/components/hr/settings/settings-ui";
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

const SOURCING: EventRow[] = [
  {
    id: "sourcing_complete",
    emailKey: "email_sourcing_complete",
    inappKey: "inapp_sourcing_complete",
    labelKey: "hr.settings.notifications.event.sourcing_complete",
    descKey: "hr.settings.notifications.event.sourcing_complete_desc",
  },
  {
    id: "sourcing_failed",
    emailKey: "email_sourcing_failed",
    inappKey: "inapp_sourcing_failed",
    labelKey: "hr.settings.notifications.event.sourcing_failed",
    descKey: "hr.settings.notifications.event.sourcing_failed_desc",
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

  const renderRow = (row: EventRow) => {
    const eventLabel = t(row.labelKey);
    return (
      <div
        key={row.id}
        className="flex flex-col gap-3 border-t border-[var(--color-line)] px-4 py-3.5 first:border-t-0 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
      >
        <div className="min-w-0">
          <div className="text-[13.5px] font-semibold text-[var(--color-text)]">{eventLabel}</div>
          <div className="mt-0.5 text-[12px] leading-[1.5] text-[var(--color-text-muted)]">
            {t(row.descKey)}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <ChannelToggle
            channel={t("hr.settings.notifications.channel.email")}
            event={eventLabel}
            on={state[row.emailKey] as boolean}
            onChange={(v) => patch({ [row.emailKey]: v } as Partial<EditablePrefs>)}
          />
          {row.inappKey ? (
            <ChannelToggle
              channel={t("hr.settings.notifications.channel.inapp")}
              event={eventLabel}
              on={state[row.inappKey] as boolean}
              onChange={(v) =>
                patch({ [row.inappKey as keyof EditablePrefs]: v } as Partial<EditablePrefs>)
              }
            />
          ) : (
            <div className="w-[52px]" aria-hidden />
          )}
        </div>
      </div>
    );
  };

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
          <PanelTitle>{t("hr.settings.notifications.group.sourcing")}</PanelTitle>
        </PanelHeader>
        {SOURCING.map(renderRow)}
      </Panel>

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.notifications.cadence.title")}</PanelTitle>
        </PanelHeader>
        <PanelBody className="space-y-5">
          <div>
            <div className="mb-1.5 text-sm font-medium text-[var(--color-text)]">
              {t("hr.settings.notifications.cadence.digest_label")}
            </div>
            <SegmentedControl
              aria-label={t("hr.settings.notifications.cadence.digest_label")}
              value={String(state.digest_hour)}
              options={DIGEST_HOURS.map((h) => ({
                value: String(h),
                label: `${String(h).padStart(2, "0")}:00`,
              }))}
              onChange={(v) => patch({ digest_hour: Number(v) })}
            />
            <p className="mt-2 text-[11.5px] text-[var(--color-text-subtle)]">
              {t("hr.settings.notifications.cadence.digest_hint")}
            </p>
          </div>

          <div>
            <div className="mb-1.5 text-sm font-medium text-[var(--color-text)]">
              {t("hr.settings.notifications.cadence.quiet_label")}
            </div>
            <div className="flex items-center gap-2">
              <HourSelect
                ariaLabel={t("hr.settings.notifications.cadence.quiet_start")}
                value={state.quiet_hours_start}
                onChange={(v) => patch({ quiet_hours_start: v })}
                offLabel={t("hr.settings.notifications.cadence.quiet_off")}
              />
              <span className="text-[11.5px] text-[var(--color-text-subtle)]">→</span>
              <HourSelect
                ariaLabel={t("hr.settings.notifications.cadence.quiet_end")}
                value={state.quiet_hours_end}
                onChange={(v) => patch({ quiet_hours_end: v })}
                offLabel={t("hr.settings.notifications.cadence.quiet_off")}
              />
            </div>
            <p className="mt-2 text-[11.5px] text-[var(--color-text-subtle)]">
              {t("hr.settings.notifications.cadence.quiet_hint")}
            </p>
          </div>
        </PanelBody>
      </Panel>

      <SettingsSaveBar
        visible={dirty || status === "ok" || status === "error"}
        message={
          status === "ok" ? (
            <span className="font-medium text-[var(--color-success)]">
              ✓ {t("hr.settings.notifications.saved")}
            </span>
          ) : status === "error" ? (
            <span className="font-medium text-[var(--color-danger)]">
              {t("hr.settings.notifications.save_error")}
            </span>
          ) : (
            <span className="text-[var(--color-text-muted)]">
              {t("hr.settings.notifications.unsaved_warn")}
            </span>
          )
        }
        onSave={save}
        saveLabel={t("hr.settings.notifications.save")}
        saving={status === "saving"}
        saveDisabled={!dirty}
        onDiscard={discard}
        discardLabel={t("hr.settings.notifications.discard")}
        discardDisabled={!dirty || status === "saving"}
      />
    </>
  );
}

function ChannelToggle({
  channel,
  event,
  on,
  onChange,
}: {
  channel: string;
  event: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[11px] text-[var(--color-text-muted)]">{channel}</span>
      <Switch checked={on} onCheckedChange={onChange} aria-label={`${event} · ${channel}`} />
    </div>
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
  const raw = value == null ? "off" : String(value);
  return (
    <Select value={raw} onValueChange={(v) => onChange(v === "off" ? null : Number(v))}>
      <SelectTrigger aria-label={ariaLabel} className="data-mono h-10 w-[110px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="off">{offLabel}</SelectItem>
        {Array.from({ length: 24 }, (_, h) => (
          <SelectItem key={h} value={String(h)}>
            {String(h).padStart(2, "0")}:00
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
    email_sourcing_complete,
    email_sourcing_failed,
    inapp_new_application,
    inapp_top_pick,
    inapp_interview_booked,
    inapp_interview_declined,
    inapp_ai_failed,
    inapp_sourcing_complete,
    inapp_sourcing_failed,
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
    email_sourcing_complete,
    email_sourcing_failed,
    inapp_new_application,
    inapp_top_pick,
    inapp_interview_booked,
    inapp_interview_declined,
    inapp_ai_failed,
    inapp_sourcing_complete,
    inapp_sourcing_failed,
    digest_hour,
    quiet_hours_start,
    quiet_hours_end,
  };
}

function shallowEq(a: EditablePrefs, b: EditablePrefs): boolean {
  const keys = Object.keys(a) as (keyof EditablePrefs)[];
  return keys.every((k) => a[k] === b[k]);
}
