"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader, PanelTitle, Seg, TezButton } from "@/components/hr/design";
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
  const ruRef = useRef<HTMLTextAreaElement>(null);
  const uzRef = useRef<HTMLTextAreaElement>(null);
  const enRef = useRef<HTMLTextAreaElement>(null);
  const editorRefs = useMemo(
    () => ({ ru: ruRef, uz: uzRef, en: enRef }),
    [],
  );

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

  const handleReset = async () => {
    if (!confirm(t("hr.settings.templates.reset_confirm"))) return;
    const next = { ...values, [active]: defaults[active] };
    setValues(next);
  };

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <TabsWithParity active={active} onChange={setActive} parity={parity} />
      </div>

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t(`hr.settings.templates.tab_${active}` as const)}</PanelTitle>
          <div className="flex items-center gap-2">
            {hasOverrides && canEdit && (
              <TezButton variant="ghost" size="sm" onClick={handleReset}>
                {t("hr.settings.templates.reset")}
              </TezButton>
            )}
          </div>
        </PanelHeader>
        <div className="grid gap-0 md:grid-cols-[1.05fr_1fr]">
          <div className="border-rule md:border-r p-[18px]">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-ink-2 text-[11.5px] font-semibold">
                {t("hr.settings.templates.variables_label")}
              </label>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {KNOWN_VARIABLES.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => handleInsert(v)}
                  disabled={!canEdit}
                  className="border-rule-2 bg-paper text-ink-2 hover:bg-bone-2 inline-flex h-6 items-center rounded-[3px] border px-1.5 text-[10.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ fontFamily: "var(--font-tez-mono)" }}
                >
                  {"{" + v + "}"}
                </button>
              ))}
            </div>
            <p className="text-ink-5 mb-2 text-[11px]">
              {t("hr.settings.templates.variable_hint")}
            </p>
            {LANGS.map((lang) => (
              <textarea
                key={lang}
                ref={editorRefs[lang]}
                value={values[lang]}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [lang]: e.target.value }))
                }
                disabled={!canEdit}
                rows={8}
                className={cn(
                  "border-rule-2 bg-paper text-ink w-full resize-y rounded-[4px] border p-2.5 text-[12.5px] leading-[1.55]",
                  lang !== active && "hidden",
                )}
                style={{ fontFamily: "var(--font-tez-mono)" }}
              />
            ))}
            {unknownByLocale[active].length > 0 && (
              <p className="text-persimmon-2 mt-2 text-[11.5px]">
                {t("hr.settings.templates.unknown_token", {
                  tokens: unknownByLocale[active].map((t) => `{${t}}`).join(", "),
                })}
              </p>
            )}
          </div>

          <div className="bg-bone-2/40 p-[18px]">
            <div className="text-ink-5 mb-2 flex items-center gap-1.5 text-[11px]">
              <span
                className="uppercase tracking-[0.08em]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {t("hr.settings.templates.preview_label")}
              </span>
              <span>·</span>
              <span>{t("hr.settings.templates.preview_via")}</span>
            </div>
            <div className="bg-paper border-rule max-w-[320px] rounded-[16px] rounded-bl-[4px] border px-4 py-3 text-[13px] leading-[1.45] shadow-tez-1">
              <pre className="text-ink whitespace-pre-wrap font-sans">
                {renderTemplate(values[active], FIXTURE)}
              </pre>
            </div>
          </div>
        </div>
      </Panel>

      {canEdit && (
        <div className="sticky bottom-3 z-10">
          <div className="border-rule bg-paper shadow-tez-2 flex items-center justify-between gap-3 rounded-[6px] border px-4 py-2.5">
            <div className="text-[12.5px]">
              {status === "ok" ? (
                <span className="text-tez-green font-medium">
                  ✓ {t("hr.settings.templates.saved")}
                </span>
              ) : status === "error" ? (
                <span className="text-tez-red font-medium">
                  {t("hr.settings.templates.save_error")}
                </span>
              ) : hasUnknown ? (
                <span className="text-persimmon-2">
                  {t("hr.settings.templates.unknown_token", {
                    tokens: LANGS.flatMap((l) =>
                      unknownByLocale[l].map((v) => `{${v}}`),
                    ).join(", "),
                  })}
                </span>
              ) : (
                <span className="text-ink-4">
                  {t("hr.settings.notifications.unsaved_warn")}
                </span>
              )}
            </div>
            <TezButton
              variant="accent"
              size="sm"
              onClick={handleSave}
              disabled={!dirty || hasUnknown || status === "saving"}
              leadingIcon={<Send className="h-3 w-3" />}
            >
              {status === "saving"
                ? t("hr.settings.templates.saving")
                : t("hr.settings.templates.save")}
            </TezButton>
          </div>
        </div>
      )}
    </>
  );
}

function TabsWithParity({
  active,
  onChange,
  parity,
}: {
  active: Lang;
  onChange: (v: Lang) => void;
  parity: Record<Lang, boolean>;
}) {
  const { t } = useTranslation();
  return (
    <Seg
      value={active}
      options={LANGS.map((lang) => ({
        value: lang,
        label: (
          <span className="inline-flex items-center gap-1.5">
            {t(`hr.settings.templates.tab_${lang}` as const)}
            {parity[lang] && (
              <span
                aria-label="parity warning"
                title={t("hr.settings.templates.parity_warning")}
                className="bg-persimmon inline-block h-[5px] w-[5px] rounded-full"
              />
            )}
          </span>
        ),
      }))}
      onChange={(v) => onChange(v as Lang)}
    />
  );
}
