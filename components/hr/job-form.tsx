"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Sparkles, Loader2, Wand2, Globe } from "lucide-react";
import { useToast } from "@/components/ui";
import { TagInput } from "@/components/hr/tag-input";
import { HardRequirementsEditor } from "@/components/hr/hard-requirements-editor";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  TezButton,
} from "@/components/hr/design";
import type { HardRequirement } from "@/types";
import type { Locale } from "@/lib/i18n/types";
import { logger } from "@/lib/logger";
import { useTranslation } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

export interface JobFormValues {
  title_ru: string;
  title_uz: string;
  title_en: string;
  description_ru: string;
  description_uz: string;
  description_en: string;
  required_skills: string[];
  hard_requirements: HardRequirement[];
}

interface JobFormProps {
  mode: "create" | "edit";
  jobId?: string;
  defaultValues?: Partial<JobFormValues>;
}

const LOCALES: { code: Locale; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "uz", label: "UZ" },
  { code: "en", label: "EN" },
];

export function JobForm({ mode, jobId, defaultValues }: JobFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [brief, setBrief] = useState("");
  const [descTab, setDescTab] = useState<Locale>("ru");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<JobFormValues>({
    defaultValues: {
      title_ru: defaultValues?.title_ru ?? "",
      title_uz: defaultValues?.title_uz ?? "",
      title_en: defaultValues?.title_en ?? "",
      description_ru: defaultValues?.description_ru ?? "",
      description_uz: defaultValues?.description_uz ?? "",
      description_en: defaultValues?.description_en ?? "",
      required_skills: defaultValues?.required_skills ?? [],
      hard_requirements: defaultValues?.hard_requirements ?? [],
    },
  });

  const titleRu = watch("title_ru");
  const titleUz = watch("title_uz");
  const titleEn = watch("title_en");
  const descRu = watch("description_ru");
  const descUz = watch("description_uz");
  const descEn = watch("description_en");

  const anyTitle = (titleRu || titleUz || titleEn).trim();
  const anyDesc = (descRu || descUz || descEn).trim();

  async function generateFromBrief() {
    const trimmed = brief.trim();
    if (trimmed.length < 4) {
      toast({ variant: "error", title: t("hr.job.ai.brief_too_short") });
      return;
    }
    setAiBusy(true);
    try {
      const res = await fetch("/api/hr/jobs/ai-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brief: trimmed }),
      });
      if (res.status === 429) {
        toast({ variant: "error", title: t("hr.job.ai.rate_limited") });
        return;
      }
      if (!res.ok) {
        toast({ variant: "error", title: t("hr.job.ai.error") });
        return;
      }
      const body = (await res.json()) as {
        draft: {
          title_ru: string;
          title_uz: string;
          title_en: string;
          description_ru: string;
          description_uz: string;
          description_en: string;
          required_skills: string[];
          hard_requirements: Array<{
            label_ru: string;
            label_uz: string;
            label_en: string;
            type: "boolean" | "number";
            min_value?: number | null;
          }>;
        };
      };
      const d = body.draft;
      setValue("title_ru", d.title_ru, { shouldDirty: true });
      setValue("title_uz", d.title_uz, { shouldDirty: true });
      setValue("title_en", d.title_en, { shouldDirty: true });
      setValue("description_ru", d.description_ru, { shouldDirty: true });
      setValue("description_uz", d.description_uz, { shouldDirty: true });
      setValue("description_en", d.description_en, { shouldDirty: true });
      setValue("required_skills", d.required_skills, { shouldDirty: true });
      setValue(
        "hard_requirements",
        d.hard_requirements.map((r, i) => ({
          id: crypto.randomUUID(),
          label_ru: r.label_ru,
          label_uz: r.label_uz,
          label_en: r.label_en,
          type: r.type,
          min_value: r.min_value ?? null,
          order: i,
        })),
        { shouldDirty: true },
      );
      toast({ variant: "success", title: t("hr.job.ai.drafted") });
    } catch (err) {
      logger.error({ err }, "[job-form] ai-draft failed");
      toast({ variant: "error", title: t("hr.job.ai.error") });
    } finally {
      setAiBusy(false);
    }
  }

  async function onSubmit(data: JobFormValues) {
    if (!anyTitle || anyTitle.length < 3) {
      toast({ variant: "error", title: t("hr.job.error.title_too_short") });
      return;
    }
    if (!anyDesc || anyDesc.length < 20) {
      toast({ variant: "error", title: t("hr.job.error.description_too_short") });
      return;
    }

    setSubmitting(true);
    try {
      // Server accepts per-locale fields + fills in missing locales via AI.
      // `title` and `description` are the legacy primary columns: use
      // whichever locale the user filled first (ru priority) as the canonical.
      const primaryTitle = data.title_ru || data.title_uz || data.title_en;
      const primaryDesc =
        data.description_ru || data.description_uz || data.description_en;

      const payload = {
        title: primaryTitle,
        description: primaryDesc,
        title_ru: data.title_ru || undefined,
        title_uz: data.title_uz || undefined,
        title_en: data.title_en || undefined,
        description_ru: data.description_ru || undefined,
        description_uz: data.description_uz || undefined,
        description_en: data.description_en || undefined,
        required_skills: data.required_skills,
        hard_requirements: data.hard_requirements,
      };

      const url = mode === "create" ? "/api/hr/jobs" : `/api/hr/jobs/${jobId}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "request_failed");
      }

      const toastKey = mode === "create" ? "created" : "updated";
      router.push(`/hr/jobs?toast=${toastKey}`);
      router.refresh();
    } catch (err) {
      logger.error({ err }, "[job-form] submit failed");
      toast({ variant: "error", title: t("hr.toast.save_error") });
    } finally {
      setSubmitting(false);
    }
  }

  const hasAnyContent = Boolean(anyTitle) || Boolean(anyDesc);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* AI assistant panel — dismissible after use */}
      {!hasAnyContent || !aiBusy ? (
        <Panel>
          <PanelHeader>
            <PanelTitle>
              <Sparkles className="text-persimmon h-3.5 w-3.5" />
              {t("hr.job.ai.panel_title")}
            </PanelTitle>
            <span
              className="text-ink-5 text-[10px] uppercase tracking-[0.08em]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
              {t("hr.job.ai.model_tag")}
            </span>
          </PanelHeader>
          <div className="p-4">
            <p className="text-ink-4 mb-3 text-[12.5px] leading-[1.5]">
              {t("hr.job.ai.panel_help")}
            </p>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={t("hr.job.ai.brief_placeholder")}
              rows={3}
              maxLength={2000}
              className="border-rule-2 bg-paper text-ink placeholder:text-ink-5 focus:border-ink w-full resize-y rounded-[4px] border px-3 py-2 text-[13px] leading-[1.5] outline-none transition-colors"
              disabled={aiBusy}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <span
                className="text-ink-5 text-[11px]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {brief.length} / 2000
              </span>
              <TezButton
                type="button"
                variant="primary"
                onClick={generateFromBrief}
                disabled={aiBusy || brief.trim().length < 4}
                leadingIcon={
                  aiBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="h-3.5 w-3.5" />
                  )
                }
              >
                {aiBusy ? t("hr.job.ai.generating") : t("hr.job.ai.generate")}
              </TezButton>
            </div>
          </div>
        </Panel>
      ) : null}

      {/* Title — three locale fields inline */}
      <Panel>
        <PanelHeader>
          <PanelTitle>
            <Globe className="text-ink-4 h-3.5 w-3.5" />
            {t("hr.job.title_label")}
          </PanelTitle>
          <span
            className="text-ink-5 text-[10.5px] uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            {t("hr.job.trilingual_hint")}
          </span>
        </PanelHeader>
        <div className="p-4">
          <div className="grid gap-3 md:grid-cols-3">
            {LOCALES.map((loc) => (
              <LocaleInput
                key={loc.code}
                localeLabel={loc.label}
                placeholder={t("hr.job.title_placeholder")}
                {...register(`title_${loc.code}` as const)}
              />
            ))}
          </div>
          {!anyTitle && errors && (
            <p className="text-[color:var(--color-tez-red)] mt-2 text-[11px]">
              {t("hr.job.error.title_too_short")}
            </p>
          )}
        </div>
      </Panel>

      {/* Description — tabbed per locale */}
      <Panel>
        <PanelHeader>
          <PanelTitle>
            <Globe className="text-ink-4 h-3.5 w-3.5" />
            {t("hr.job.description_label")}
          </PanelTitle>
          <div
            className="border-rule-2 bg-bone inline-flex h-[26px] items-center rounded-[4px] border p-[1px]"
          >
            {LOCALES.map((loc) => (
              <button
                key={loc.code}
                type="button"
                onClick={() => setDescTab(loc.code)}
                className={cn(
                  "rounded-[3px] px-2.5 text-[11px] font-medium transition-colors",
                  descTab === loc.code
                    ? "bg-paper text-ink shadow-tez-1"
                    : "text-ink-4 hover:text-ink",
                )}
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {loc.label}
              </button>
            ))}
          </div>
        </PanelHeader>
        <div className="p-4">
          {LOCALES.map((loc) => {
            const isActive = descTab === loc.code;
            const val = loc.code === "ru" ? descRu : loc.code === "uz" ? descUz : descEn;
            return (
              <div key={loc.code} className={cn(isActive ? "block" : "hidden")}>
                <textarea
                  {...register(`description_${loc.code}` as const)}
                  rows={8}
                  placeholder={t("hr.job.description_placeholder")}
                  className="border-rule-2 bg-paper text-ink placeholder:text-ink-5 focus:border-ink w-full resize-y rounded-[4px] border px-3 py-2 text-[13px] leading-[1.55] outline-none transition-colors"
                />
                <div
                  className="text-ink-5 mt-1 flex justify-end text-[11px]"
                  style={{ fontFamily: "var(--font-tez-mono)" }}
                >
                  {val?.length ?? 0}
                </div>
              </div>
            );
          })}
          {!anyDesc && (
            <p className="text-ink-5 text-[11px]">{t("hr.job.description_hint")}</p>
          )}
        </div>
      </Panel>

      {/* Skills */}
      <Panel>
        <PanelHeader>
          <PanelTitle>{t("hr.job.skills_label")}</PanelTitle>
          <span
            className="text-ink-5 text-[10.5px] uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            {t("hr.job.skills_shared_hint")}
          </span>
        </PanelHeader>
        <div className="p-4">
          <Controller
            control={control}
            name="required_skills"
            render={({ field }) => (
              <TagInput
                value={field.value}
                onChange={field.onChange}
                placeholder={t("hr.job.skills_placeholder")}
              />
            )}
          />
        </div>
      </Panel>

      {/* Hard requirements */}
      <Panel>
        <PanelHeader>
          <PanelTitle>{t("hr.job.requirements_label")}</PanelTitle>
        </PanelHeader>
        <div className="p-4">
          <Controller
            control={control}
            name="hard_requirements"
            render={({ field }) => (
              <HardRequirementsEditor
                value={field.value as HardRequirement[]}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </Panel>

      {/* Footer */}
      <div className="border-rule flex items-center justify-between gap-3 border-t pt-5">
        <p className="text-ink-5 max-w-md text-[11.5px] leading-[1.4]">
          {t("hr.job.save_autotranslate_hint")}
        </p>
        <div className="flex gap-2">
          <TezButton
            type="button"
            variant="ghost"
            onClick={() => router.back()}
            disabled={submitting}
          >
            {t("common.cancel")}
          </TezButton>
          <TezButton
            type="submit"
            variant="primary"
            disabled={submitting}
            leadingIcon={
              submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined
            }
          >
            {submitting
              ? t("common.saving")
              : t(mode === "create" ? "hr.jobs.create" : "hr.job.save_changes")}
          </TezButton>
        </div>
      </div>
    </form>
  );
}

interface LocaleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  localeLabel: string;
}

const LocaleInput = forwardRef<HTMLInputElement, LocaleInputProps>(
  ({ localeLabel, className, ...rest }, ref) => {
    return (
      <div className="border-rule-2 bg-paper flex h-[36px] items-center overflow-hidden rounded-[4px] border focus-within:border-[color:var(--color-ink)]">
        <span
          className="bg-bone text-ink-5 border-rule flex h-full w-9 shrink-0 items-center justify-center border-r text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ fontFamily: "var(--font-tez-mono)" }}
        >
          {localeLabel}
        </span>
        <input
          ref={ref}
          type="text"
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent px-3 text-[13px] outline-none",
            className,
          )}
          {...rest}
        />
      </div>
    );
  },
);
LocaleInput.displayName = "LocaleInput";
