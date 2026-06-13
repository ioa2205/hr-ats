"use client";

import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { Sparkles, Loader2, Wand2, Globe } from "lucide-react";
import {
  useToast,
  Panel,
  PanelHeader,
  PanelTitle,
  Button,
  Textarea,
  FieldMessage,
  SegmentedControl,
} from "@/components/ui";
import { TagInput } from "@/components/hr/tag-input";
import { HardRequirementsEditor } from "@/components/hr/hard-requirements-editor";
import { OpenQuestionsEditor } from "@/components/hr/open-questions-editor";
import type { HardRequirement, OpenQuestion, OptionalQuestion } from "@/types";
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
  optional_questions: OptionalQuestion[];
  open_questions: OpenQuestion[];
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
      optional_questions: defaultValues?.optional_questions ?? [],
      open_questions: defaultValues?.open_questions ?? [],
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
      type DraftQuestion = {
        label_ru: string;
        label_uz: string;
        label_en: string;
        type: "boolean" | "number";
        min_value?: number | null;
      };
      const body = (await res.json()) as {
        draft: {
          title_ru: string;
          title_uz: string;
          title_en: string;
          description_ru: string;
          description_uz: string;
          description_en: string;
          required_skills: string[];
          hard_requirements: DraftQuestion[];
          optional_questions?: DraftQuestion[];
          open_questions?: Array<{
            prompt_ru: string;
            prompt_uz: string;
            prompt_en: string;
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
      setValue(
        "optional_questions",
        (d.optional_questions ?? []).map((r, i) => ({
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
      setValue(
        "open_questions",
        (d.open_questions ?? []).map((q, i) => ({
          id: crypto.randomUUID(),
          prompt_ru: q.prompt_ru,
          prompt_uz: q.prompt_uz,
          prompt_en: q.prompt_en,
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
      const primaryDesc = data.description_ru || data.description_uz || data.description_en;

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
        optional_questions: data.optional_questions,
        open_questions: data.open_questions,
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
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      {/* AI assistant — dismissed while drafting once there is content */}
      {!hasAnyContent || !aiBusy ? (
        <Panel>
          <PanelHeader>
            <PanelTitle>
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              {t("hr.job.ai.panel_title")}
            </PanelTitle>
            <span className="data-mono text-[10px] tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
              {t("hr.job.ai.model_tag")}
            </span>
          </PanelHeader>
          <div className="p-4">
            <p className="mb-3 text-[12.5px] leading-[1.5] text-[var(--color-text-muted)]">
              {t("hr.job.ai.panel_help")}
            </p>
            <Textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              placeholder={t("hr.job.ai.brief_placeholder")}
              rows={3}
              maxLength={2000}
              maxCharacters={2000}
              currentLength={brief.length}
              disabled={aiBusy}
              aria-label={t("hr.job.ai.panel_title")}
            />
            <div className="mt-2 flex justify-end">
              <Button
                type="button"
                onClick={generateFromBrief}
                loading={aiBusy}
                disabled={aiBusy || brief.trim().length < 4}
              >
                {aiBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
                ) : (
                  <Wand2 className="h-4 w-4" />
                )}
                {aiBusy ? t("hr.job.ai.generating") : t("hr.job.ai.generate")}
              </Button>
            </div>
          </div>
        </Panel>
      ) : null}

      {/* Title — three locale fields inline */}
      <Panel>
        <PanelHeader>
          <PanelTitle>
            <Globe className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            {t("hr.job.title_label")}
          </PanelTitle>
          <span className="data-mono text-[10.5px] tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
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
                aria-label={`${t("hr.job.title_label")} (${loc.label})`}
                {...register(`title_${loc.code}` as const)}
              />
            ))}
          </div>
          {!anyTitle && (
            <FieldMessage tone="error" className="mt-2">
              {t("hr.job.error.title_too_short")}
            </FieldMessage>
          )}
        </div>
      </Panel>

      {/* Description — tabbed per locale */}
      <Panel>
        <PanelHeader>
          <PanelTitle>
            <Globe className="h-3.5 w-3.5 text-[var(--color-text-muted)]" />
            {t("hr.job.description_label")}
          </PanelTitle>
          <SegmentedControl<Locale>
            size="sm"
            value={descTab}
            onChange={setDescTab}
            aria-label={t("hr.job.description_label")}
            options={LOCALES.map((loc) => ({ value: loc.code, label: loc.label }))}
          />
        </PanelHeader>
        <div className="p-4">
          {LOCALES.map((loc) => {
            const isActive = descTab === loc.code;
            const val = loc.code === "ru" ? descRu : loc.code === "uz" ? descUz : descEn;
            return (
              <div key={loc.code} className={cn(isActive ? "block" : "hidden")}>
                <Textarea
                  {...register(`description_${loc.code}` as const)}
                  rows={8}
                  placeholder={t("hr.job.description_placeholder")}
                  aria-label={`${t("hr.job.description_label")} (${loc.label})`}
                />
                <div className="mt-1 flex justify-end font-[var(--font-mono)] text-[11px] text-[var(--color-text-subtle)]">
                  {val?.length ?? 0}
                </div>
              </div>
            );
          })}
          {!anyDesc && (
            <FieldMessage className="mt-1">{t("hr.job.description_hint")}</FieldMessage>
          )}
        </div>
      </Panel>

      {/* Skills */}
      <Panel>
        <PanelHeader>
          <PanelTitle>{t("hr.job.skills_label")}</PanelTitle>
          <span className="data-mono text-[10.5px] tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
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

      {/* Optional questions — recorded + inform AI, never block the candidate */}
      <Panel>
        <PanelHeader>
          <PanelTitle>{t("hr.job.optional_questions_label")}</PanelTitle>
        </PanelHeader>
        <div className="p-4">
          <Controller
            control={control}
            name="optional_questions"
            render={({ field }) => (
              <HardRequirementsEditor
                value={field.value as OptionalQuestion[]}
                onChange={field.onChange}
                hint={t("hr.job.optional_questions_hint")}
                addLabel={t("hr.job.add_optional_question")}
              />
            )}
          />
        </div>
      </Panel>

      {/* Open questions — free-text prompts fed to AI screening */}
      <Panel>
        <PanelHeader>
          <PanelTitle>{t("hr.job.open_questions_label")}</PanelTitle>
        </PanelHeader>
        <div className="p-4">
          <Controller
            control={control}
            name="open_questions"
            render={({ field }) => (
              <OpenQuestionsEditor
                value={field.value as OpenQuestion[]}
                onChange={field.onChange}
              />
            )}
          />
        </div>
      </Panel>

      {/* Footer */}
      <div className="flex flex-col gap-3 border-t border-[var(--color-line)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-[11.5px] leading-[1.4] text-[var(--color-text-subtle)]">
          {t("hr.job.save_autotranslate_hint")}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => router.back()} disabled={submitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={submitting}>
            {submitting
              ? t("common.saving")
              : t(mode === "create" ? "hr.jobs.create" : "hr.job.save_changes")}
          </Button>
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
      <div className="flex h-11 items-center overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] transition-colors focus-within:border-[var(--color-focus)]">
        <span className="data-mono flex h-full w-9 shrink-0 items-center justify-center border-r border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-[10px] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
          {localeLabel}
        </span>
        <input
          ref={ref}
          type="text"
          className={cn(
            "min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]",
            className,
          )}
          {...rest}
        />
      </div>
    );
  },
);
LocaleInput.displayName = "LocaleInput";
