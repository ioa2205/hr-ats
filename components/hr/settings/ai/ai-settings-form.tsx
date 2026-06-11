"use client";

import { useMemo, useState, useTransition } from "react";
import {
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  SegmentedControl,
  Switch,
} from "@/components/ui";
import { SettingRow, SettingsSaveBar } from "@/components/hr/settings/settings-ui";
import { useTranslation } from "@/lib/i18n/provider";
import { saveAiSettings } from "@/lib/actions/ai-settings";
import type { AiSettings, AiTone } from "@/lib/ai-settings";

const QUESTION_COUNTS: (5 | 6 | 7)[] = [5, 6, 7];
const TONES: AiTone[] = ["direct", "neutral", "generous"];

export function AiSettingsForm({ initial }: { initial: AiSettings }) {
  const { t } = useTranslation();
  const [state, setState] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<"idle" | "error" | "ok">("idle");
  const [pending, startTransition] = useTransition();

  const dirty = useMemo(() => !shallowEq(state, saved), [state, saved]);

  const patch = <K extends keyof AiSettings>(k: K, v: AiSettings[K]) =>
    setState((s) => ({ ...s, [k]: v }));

  const save = () => {
    setStatus("idle");
    startTransition(async () => {
      const res = await saveAiSettings(state);
      if (res.ok) {
        setSaved(state);
        setStatus("ok");
        setTimeout(() => setStatus("idle"), 1600);
      } else {
        setStatus("error");
      }
    });
  };

  const discard = () => {
    setState(saved);
    setStatus("idle");
  };

  return (
    <>
      <Panel className="mb-4">
        <SettingRow
          title={t("hr.settings.ai.auto_screen_title")}
          description={t("hr.settings.ai.auto_screen_clarify")}
          control={
            <Switch
              checked={state.autoScreenEnabled}
              onCheckedChange={(v) => patch("autoScreenEnabled", v)}
              aria-label={t("hr.settings.ai.auto_screen_title")}
            />
          }
        />
        <div className="border-t border-[var(--color-line)] p-4">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="text-[13.5px] font-semibold text-[var(--color-text)]">
                {t("hr.settings.ai.auto_reject_slider_label")}
              </div>
              <p className="mt-1 text-[12px] text-[var(--color-text-muted)]">
                {t("hr.settings.ai.auto_reject_desc")}
              </p>
            </div>
            <div className="data-mono text-[13px] font-semibold tabular-nums text-[var(--color-text)]">
              {state.autoRejectThreshold === 0
                ? t("hr.settings.ai.auto_reject_off")
                : `< ${state.autoRejectThreshold}`}
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={60}
            step={1}
            value={state.autoRejectThreshold}
            onChange={(e) => patch("autoRejectThreshold", Number(e.target.value))}
            className="mt-3 w-full accent-[var(--color-primary)]"
            aria-label={t("hr.settings.ai.auto_reject_slider_label")}
          />
          {state.autoRejectThreshold > 50 && (
            <p className="mt-1 text-[11.5px] text-[var(--color-warning)]">
              {t("hr.settings.ai.auto_reject_hint_aggressive")}
            </p>
          )}
        </div>
      </Panel>

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.ai.model_title")}</PanelTitle>
        </PanelHeader>
        <PanelBody className="space-y-5">
          <div>
            <div className="mb-1.5 text-sm font-medium text-[var(--color-text)]">
              {t("hr.settings.ai.tone_label")}
            </div>
            <SegmentedControl
              aria-label={t("hr.settings.ai.tone_label")}
              value={state.tone}
              options={TONES.map((tone) => ({
                value: tone,
                label: t(
                  tone === "direct"
                    ? "hr.settings.ai.tone_direct"
                    : tone === "neutral"
                      ? "hr.settings.ai.tone_neutral"
                      : "hr.settings.ai.tone_generous",
                ),
              }))}
              onChange={(v) => patch("tone", v as AiTone)}
            />
          </div>

          <div className="space-y-2 border-t border-[var(--color-line)] pt-4">
            <div className="text-[11.5px] text-[var(--color-text-muted)]">
              {t("hr.settings.ai.provider_label")}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="data-mono inline-flex h-5 items-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-1.5 text-[10.5px] text-[var(--color-text-muted)]">
                gemini-3.1-pro
              </span>
              <span className="text-[11.5px] text-[var(--color-text-subtle)]">·</span>
              <span className="text-[11.5px] text-[var(--color-text-muted)]">
                {t("hr.settings.ai.region_value")}
              </span>
            </div>
            <div className="text-[11.5px] text-[var(--color-text-subtle)]">
              {t("hr.settings.ai.provider_note")}
            </div>
          </div>
        </PanelBody>
      </Panel>

      <Panel className="mb-4">
        <SettingRow
          title={t("hr.settings.ai.interview_auto_title")}
          description={t("hr.settings.ai.interview_auto_desc")}
          control={
            <Switch
              checked={state.interviewQuestionsAutoGenerate}
              onCheckedChange={(v) => patch("interviewQuestionsAutoGenerate", v)}
              aria-label={t("hr.settings.ai.interview_auto_title")}
            />
          }
        />
        <div className="border-t border-[var(--color-line)] p-4">
          <div className="mb-1.5 text-sm font-medium text-[var(--color-text)]">
            {t("hr.settings.ai.question_count_label")}
          </div>
          <SegmentedControl
            aria-label={t("hr.settings.ai.question_count_label")}
            value={String(state.interviewQuestionCount)}
            options={QUESTION_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
            onChange={(v) => patch("interviewQuestionCount", Number(v) as 5 | 6 | 7)}
          />
          <p className="mt-2 text-[11.5px] text-[var(--color-text-subtle)]">
            {t("hr.settings.ai.question_count_hint")}
          </p>
        </div>
      </Panel>

      <SettingsSaveBar
        visible={dirty || status !== "idle"}
        message={
          status === "ok" ? (
            <span className="font-medium text-[var(--color-success)]">
              ✓ {t("hr.settings.ai.saved")}
            </span>
          ) : status === "error" ? (
            <span className="font-medium text-[var(--color-danger)]">
              {t("hr.settings.ai.save_error")}
            </span>
          ) : (
            <span className="text-[var(--color-text-muted)]">
              {t("hr.settings.notifications.unsaved_warn")}
            </span>
          )
        }
        onSave={save}
        saveLabel={t("hr.settings.ai.save")}
        saving={pending}
        saveDisabled={!dirty}
        onDiscard={discard}
        discardLabel={t("hr.settings.notifications.discard")}
        discardDisabled={!dirty || pending}
      />
    </>
  );
}

function shallowEq(a: AiSettings, b: AiSettings): boolean {
  return (
    a.autoScreenEnabled === b.autoScreenEnabled &&
    a.autoRejectThreshold === b.autoRejectThreshold &&
    a.tone === b.tone &&
    a.interviewQuestionsAutoGenerate === b.interviewQuestionsAutoGenerate &&
    a.interviewQuestionCount === b.interviewQuestionCount
  );
}
