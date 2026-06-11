"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Save } from "lucide-react";
import { Button, Textarea, useToast } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";

type Lang = "ru" | "uz" | "en";

const VARIABLES = [
  { key: "name", label: "{name}" },
  { key: "position", label: "{position}" },
];

const LANG_LABEL_KEYS: Record<Lang, TranslationKey> = {
  ru: "operator.templates.lang.ru",
  uz: "operator.templates.lang.uz",
  en: "operator.templates.lang.en",
};

export default function OperatorTemplatesPage() {
  const { t } = useTranslation();
  const [templates, setTemplates] = useState<Record<Lang, string>>({ ru: "", uz: "", en: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const refs: Record<Lang, React.RefObject<HTMLTextAreaElement | null>> = {
    ru: useRef<HTMLTextAreaElement>(null),
    uz: useRef<HTMLTextAreaElement>(null),
    en: useRef<HTMLTextAreaElement>(null),
  };

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/operator/templates");
      if (res.ok) {
        const data = await res.json();
        setTemplates({
          ru: data.telegram_invite_ru ?? "",
          uz: data.telegram_invite_uz ?? "",
          en: data.telegram_invite_en ?? "",
        });
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function setLangValue(lang: Lang, value: string) {
    setTemplates((prev) => ({ ...prev, [lang]: value }));
  }

  const insertVariable = (lang: Lang, variable: string) => {
    const el = refs[lang].current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const insertion = `{${variable}}`;
    const newText = text.slice(0, start) + insertion + text.slice(end);
    setLangValue(lang, newText);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start + insertion.length;
      el.selectionEnd = start + insertion.length;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/operator/templates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram_invite_ru: templates.ru,
          telegram_invite_uz: templates.uz,
          telegram_invite_en: templates.en,
        }),
      });
      if (res.ok) {
        toast({
          variant: "success",
          title: t("operator.templates.toast.saved"),
          description: t("operator.templates.toast.saved_desc"),
        });
      } else {
        const data = await res.json();
        toast({
          variant: "error",
          title: t("operator.templates.toast.save_failed"),
          description: data.error ?? t("operator.templates.toast.save_failed_desc"),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-[var(--color-surface-subtle)] h-6 w-40 animate-pulse rounded" />
        <div className="bg-[var(--color-surface-subtle)] h-32 w-full animate-pulse rounded-[var(--radius-md)]" />
        <div className="bg-[var(--color-surface-subtle)] h-32 w-full animate-pulse rounded-[var(--radius-md)]" />
        <div className="bg-[var(--color-surface-subtle)] h-32 w-full animate-pulse rounded-[var(--radius-md)]" />
      </div>
    );
  }

  const langs: Lang[] = ["ru", "uz", "en"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[var(--color-text)] text-2xl font-semibold">
            {t("operator.templates.title")}
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            {t("operator.templates.description")}
          </p>
        </div>
        <Button
          size="sm"
          loading={saving}
          onClick={handleSave}
          aria-label={t("operator.templates.aria_save")}
        >
          <Save className="h-4 w-4" />
          {t("operator.templates.save")}
        </Button>
      </div>

      <div className="space-y-4">
        {langs.map((lang) => (
          <div key={lang}>
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[var(--color-text)] text-sm font-medium">
                {t(LANG_LABEL_KEYS[lang])}
              </span>
              <div className="flex gap-1">
                {VARIABLES.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(lang, v.key)}
                    className="bg-primary-container text-on-primary-container hover:bg-primary-container/80 rounded-[var(--radius-sm)] px-2 py-0.5 text-xs font-medium"
                    aria-label={t("operator.templates.insert_var", { label: v.label })}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <Textarea
              ref={refs[lang]}
              value={templates[lang]}
              onChange={(e) => setLangValue(lang, e.target.value)}
              autoGrow
            />
          </div>
        ))}
      </div>
    </div>
  );
}
