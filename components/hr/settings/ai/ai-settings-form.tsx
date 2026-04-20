"use client";

import { useMemo, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader, PanelTitle, Seg, TezButton } from "@/components/hr/design";
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
        <div className="flex items-start justify-between gap-6 p-[18px]">
          <div className="min-w-0 flex-1">
            <div className="text-ink text-[13.5px] font-semibold">
              {t("hr.settings.ai.auto_screen_title")}
            </div>
            <p className="text-ink-4 mt-1 text-[12px] leading-[1.5]">
              {t("hr.settings.ai.auto_screen_clarify")}
            </p>
          </div>
          <ToggleSwitch
            on={state.autoScreenEnabled}
            onChange={(v) => patch("autoScreenEnabled", v)}
            label={t("hr.settings.ai.auto_screen_title")}
          />
        </div>

        <div className="border-rule border-t p-[18px]">
          <div className="flex items-start justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="text-ink text-[13.5px] font-semibold">
                {t("hr.settings.ai.auto_reject_slider_label")}
              </div>
              <p className="text-ink-4 mt-1 text-[12px]">
                {t("hr.settings.ai.auto_reject_desc")}
              </p>
            </div>
            <div
              className="text-ink text-[13px] font-semibold tabular-nums"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
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
            className="accent-ink mt-3 w-full"
            aria-label={t("hr.settings.ai.auto_reject_slider_label")}
          />
          {state.autoRejectThreshold > 50 && (
            <p className="text-persimmon-2 mt-1 text-[11.5px]">
              {t("hr.settings.ai.auto_reject_hint_aggressive")}
            </p>
          )}
        </div>
      </Panel>

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.ai.model_title")}</PanelTitle>
        </PanelHeader>
        <div className="space-y-5 p-[18px]">
          <div>
            <label className="text-ink-2 text-[11.5px] font-semibold">
              {t("hr.settings.ai.tone_label")}
            </label>
            <div className="mt-1.5">
              <Seg
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
                onChange={(v) => patch("tone", v)}
              />
            </div>
          </div>

          <div className="border-rule space-y-2 border-t pt-4">
            <div className="text-ink-4 text-[11.5px]">
              {t("hr.settings.ai.provider_label")}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="border-rule bg-bone text-ink-3 inline-flex h-5 items-center rounded-[3px] border px-1.5 text-[10.5px]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                gemini-3.1-pro
              </span>
              <span className="text-ink-5 text-[11.5px]">·</span>
              <span className="text-ink-4 text-[11.5px]">
                {t("hr.settings.ai.region_value")}
              </span>
            </div>
            <div className="text-ink-5 text-[11.5px]">
              {t("hr.settings.ai.provider_note")}
            </div>
          </div>
        </div>
      </Panel>

      <Panel className="mb-4">
        <div className="flex items-start justify-between gap-6 p-[18px]">
          <div className="min-w-0 flex-1">
            <div className="text-ink text-[13.5px] font-semibold">
              {t("hr.settings.ai.interview_auto_title")}
            </div>
            <p className="text-ink-4 mt-1 text-[12px] leading-[1.5]">
              {t("hr.settings.ai.interview_auto_desc")}
            </p>
          </div>
          <ToggleSwitch
            on={state.interviewQuestionsAutoGenerate}
            onChange={(v) => patch("interviewQuestionsAutoGenerate", v)}
            label={t("hr.settings.ai.interview_auto_title")}
          />
        </div>
        <div className="border-rule border-t p-[18px]">
          <label className="text-ink-2 text-[11.5px] font-semibold">
            {t("hr.settings.ai.question_count_label")}
          </label>
          <div className="mt-1.5">
            <Seg
              value={String(state.interviewQuestionCount)}
              options={QUESTION_COUNTS.map((n) => ({ value: String(n), label: String(n) }))}
              onChange={(v) =>
                patch("interviewQuestionCount", Number(v) as 5 | 6 | 7)
              }
            />
          </div>
          <p className="text-ink-5 mt-2 text-[11.5px]">
            {t("hr.settings.ai.question_count_hint")}
          </p>
        </div>
      </Panel>

      <SaveBar
        dirty={dirty}
        status={status}
        pending={pending}
        onSave={save}
        onDiscard={discard}
        labels={{
          save: t("hr.settings.ai.save"),
          discard: t("hr.settings.notifications.discard"),
          saved: t("hr.settings.ai.saved"),
          error: t("hr.settings.ai.save_error"),
          unsaved: t("hr.settings.notifications.unsaved_warn"),
        }}
      />
    </>
  );
}

function ToggleSwitch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-[10px] border transition-colors",
        on ? "bg-ink border-ink" : "bg-bone-3 border-rule-2",
      )}
    >
      <span
        className="bg-paper absolute top-[2px] h-[15px] w-[15px] rounded-full shadow-sm transition-[left]"
        style={{ left: on ? 18 : 2 }}
      />
    </button>
  );
}

function SaveBar({
  dirty,
  status,
  pending,
  onSave,
  onDiscard,
  labels,
}: {
  dirty: boolean;
  status: "idle" | "error" | "ok";
  pending: boolean;
  onSave: () => void;
  onDiscard: () => void;
  labels: { save: string; discard: string; unsaved: string; saved: string; error: string };
}) {
  if (!dirty && status === "idle") return null;
  return (
    <div className="sticky bottom-3 z-10">
      <div className="border-rule bg-paper shadow-tez-2 flex items-center justify-between gap-3 rounded-[6px] border px-4 py-2.5">
        <div className="text-[12.5px]">
          {status === "ok" ? (
            <span className="text-tez-green font-medium">✓ {labels.saved}</span>
          ) : status === "error" ? (
            <span className="text-tez-red font-medium">{labels.error}</span>
          ) : (
            <span className="text-ink-4">{labels.unsaved}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <TezButton variant="ghost" size="sm" onClick={onDiscard} disabled={!dirty || pending}>
            {labels.discard}
          </TezButton>
          <TezButton
            variant="accent"
            size="sm"
            onClick={onSave}
            disabled={!dirty || pending}
          >
            {labels.save}
          </TezButton>
        </div>
      </div>
    </div>
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
