"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Button,
  Panel,
  PanelHeader,
  PanelTitle,
  SegmentedControl,
  Textarea,
} from "@/components/ui";
import { ConfirmDialog, SettingsSaveBar } from "@/components/hr/settings/settings-ui";
import { useTranslation } from "@/lib/i18n/provider";
import {
  KNOWN_VARIABLES,
  detectLocaleParity,
  renderTemplate,
  unknownVariables,
} from "@/lib/templates/variables";

type Lang = "ru" | "uz" | "en";

const LANGS: Lang[] = ["ru", "uz", "en"];

const FIXTURE = {
  name: "Aziza Karimova",
  position: "ML Engineer",
  company: "TezHR",
  interview_link: "https://tezhr.uz/interview/demo",
  your_name: "Dilshod",
};

export interface TemplatesEditorProps {
  initial: { ru: string; uz: string; en: string };
  defaults: { ru: string; uz: string; en: string };
  canEdit: boolean;
  hasOverrides: boolean;
}

export function TemplatesEditor({ initial, defaults, canEdit, hasOverrides }: TemplatesEditorProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [active, setActive] = useState<Lang>("ru");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [resetOpen, setResetOpen] = useState(false);
  const ruRef = useRef<HTMLTextAreaElement>(null);
  const uzRef = useRef<HTMLTextAreaElement>(null);
  const enRef = useRef<HTMLTextAreaElement>(null);
  const editorRefs = useMemo(() => ({ ru: ruRef, uz: uzRef, en: enRef }), []);

  const parity = useMemo(() => detectLocaleParity(values), [values]);
  const unknownByLocale = useMemo(
    () =>
      ({
        ru: unknownVariables(values.ru),
        uz: unknownVariables(values.uz),
        en: unknownVariables(values.en),
      }) as Record<Lang, string[]>,
    [values],
  );
  const hasUnknown = LANGS.some((l) => unknownByLocale[l].length > 0);
  const dirty = LANGS.some((l) => values[l] !== saved[l]);

  const handleInsert = useCallback(
    (variable: string) => {
      const token = `{${variable}}`;
      const el = editorRefs[active].current;
      if (!el) {
        setValues((prev) => ({ ...prev, [active]: prev[active] + token }));
        return;
      }
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const next = `${el.value.slice(0, start)}${token}${el.value.slice(end)}`;
      setValues((prev) => ({ ...prev, [active]: next }));
      requestAnimationFrame(() => {
        el.focus();
        const caret = start + token.length;
        el.setSelectionRange(caret, caret);
      });
    },
    [active, editorRefs],
  );

  const handleSave = async () => {
    if (hasUnknown) return;
    setStatus("saving");
    try {
      const res = await fetch("/api/hr/team/templates", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          telegram_invite_ru: values.ru,
          telegram_invite_uz: values.uz,
          telegram_invite_en: values.en,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSaved(values);
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 1600);
    } catch {
      setStatus("error");
    }
  };

  const handleReset = () => {
    setValues((prev) => ({ ...prev, [active]: defaults[active] }));
    setResetOpen(false);
  };

  return (
    <>
      <div className="mb-3">
        <SegmentedControl
          aria-label={t("hr.settings.templates.tab_ru")}
          value={active}
          options={LANGS.map((lang) => ({
            value: lang,
            label: (
              <span className="inline-flex items-center gap-1.5">
                {t(`hr.settings.templates.tab_${lang}` as const)}
                {parity[lang] && (
                  <span
                    aria-label={t("hr.settings.templates.parity_warning")}
                    title={t("hr.settings.templates.parity_warning")}
                    className="inline-block h-[5px] w-[5px] rounded-full bg-[var(--color-accent)]"
                  />
                )}
              </span>
            ),
          }))}
          onChange={(v) => setActive(v as Lang)}
        />
      </div>

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t(`hr.settings.templates.tab_${active}` as const)}</PanelTitle>
          {hasOverrides && canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setResetOpen(true)}>
              {t("hr.settings.templates.reset")}
            </Button>
          )}
        </PanelHeader>
        <div className="grid gap-0 md:grid-cols-[1.05fr_1fr]">
          <div className="border-b border-[var(--color-line)] p-4 md:border-r md:border-b-0">
            <label className="text-[11.5px] font-semibold text-[var(--color-text-muted)]">
              {t("hr.settings.templates.variables_label")}
            </label>
            <div className="mt-2 mb-3 flex flex-wrap gap-1.5">
              {KNOWN_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleInsert(v)}
                  disabled={!canEdit}
                  className="data-mono inline-flex h-7 items-center rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2 text-[10.5px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {"{" + v + "}"}
                </button>
              ))}
            </div>
            <p className="mb-2 text-[11px] text-[var(--color-text-subtle)]">
              {t("hr.settings.templates.variable_hint")}
            </p>
            {LANGS.map((lang) => (
              <Textarea
                key={lang}
                ref={editorRefs[lang]}
                aria-label={t(`hr.settings.templates.tab_${lang}` as const)}
                value={values[lang]}
                onChange={(e) => setValues((prev) => ({ ...prev, [lang]: e.target.value }))}
                disabled={!canEdit}
                rows={8}
                className={cn("data-mono leading-[1.55]", lang !== active && "hidden")}
              />
            ))}
            {unknownByLocale[active].length > 0 && (
              <p className="mt-2 text-[11.5px] text-[var(--color-danger)]">
                {t("hr.settings.templates.unknown_token", {
                  tokens: unknownByLocale[active].map((tok) => `{${tok}}`).join(", "),
                })}
              </p>
            )}
          </div>

          <div className="bg-[var(--color-surface-subtle)] p-4">
            <div className="mb-2 flex items-center gap-1.5 text-[11px] text-[var(--color-text-subtle)]">
              <span className="data-mono uppercase tracking-[0.08em]">
                {t("hr.settings.templates.preview_label")}
              </span>
              <span>·</span>
              <span>{t("hr.settings.templates.preview_via")}</span>
            </div>
            <div className="max-w-[320px] rounded-[var(--radius-lg)] rounded-bl-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3 text-[13px] leading-[1.45] shadow-level-1">
              <pre className="whitespace-pre-wrap font-sans text-[var(--color-text)]">
                {renderTemplate(values[active], FIXTURE)}
              </pre>
            </div>
          </div>
        </div>
      </Panel>

      {canEdit && (
        <SettingsSaveBar
          visible
          message={
            status === "ok" ? (
              <span className="font-medium text-[var(--color-success)]">
                ✓ {t("hr.settings.templates.saved")}
              </span>
            ) : status === "error" ? (
              <span className="font-medium text-[var(--color-danger)]">
                {t("hr.settings.templates.save_error")}
              </span>
            ) : hasUnknown ? (
              <span className="text-[var(--color-danger)]">
                {t("hr.settings.templates.unknown_token", {
                  tokens: LANGS.flatMap((l) => unknownByLocale[l].map((v) => `{${v}}`)).join(", "),
                })}
              </span>
            ) : (
              <span className="text-[var(--color-text-muted)]">
                {t("hr.settings.notifications.unsaved_warn")}
              </span>
            )
          }
          onSave={handleSave}
          saveLabel={
            status === "saving" ? t("hr.settings.templates.saving") : t("hr.settings.templates.save")
          }
          saving={status === "saving"}
          saveDisabled={!dirty || hasUnknown}
          saveIcon={<Send className="h-3.5 w-3.5" aria-hidden="true" />}
        />
      )}

      <ConfirmDialog
        open={resetOpen}
        onOpenChange={setResetOpen}
        title={t("hr.settings.templates.reset")}
        description={t("hr.settings.templates.reset_confirm")}
        confirmLabel={t("hr.settings.templates.reset")}
        cancelLabel={t("common.cancel")}
        onConfirm={handleReset}
        tone="primary"
      />
    </>
  );
}
