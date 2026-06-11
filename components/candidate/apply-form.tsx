"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Clock, Loader2, ShieldCheck } from "lucide-react";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import type { HardRequirement } from "@/types";
import { cn } from "@/lib/utils";
import { Alert, Button, Card, Input, Panel, PanelHeader, PanelTitle } from "@/components/ui";
import { CvDropzone } from "./cv-dropzone";
import { JobDescription } from "./job-description";
import { SuccessState } from "./success-state";

interface ApplyFormProps {
  posting: {
    id: string;
    title: string;
    description: string;
    public_token: string;
    hard_requirements: HardRequirement[];
  };
  company: {
    name: string;
    logo_url: string | null;
  };
  locale: Locale;
  translations: Record<string, string>;
  turnstileSiteKey: string;
}

interface FormValues {
  requirements: Record<string, string>;
  full_name: string;
  phone_number: string;
}

function TrustChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-3 py-1 text-[12px] font-medium text-[var(--color-text-muted)]">
      <span className="shrink-0 text-[var(--color-text-subtle)]" aria-hidden="true">
        {icon}
      </span>
      {children}
    </span>
  );
}

/** Compact two-step progress for the requirements → details flow. */
function StepProgress({
  current,
  labels,
  progressLabel,
}: {
  current: 1 | 2;
  labels: [string, string];
  progressLabel: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="data-mono text-[11px] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
        {progressLabel}
      </p>
      <ol className="flex items-center gap-2" aria-hidden="true">
        {labels.map((label, idx) => {
          const step = (idx + 1) as 1 | 2;
          const done = step < current;
          const active = step === current;
          return (
            <li key={label} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                  done || active
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                    : "bg-[var(--color-surface-strong)] text-[var(--color-text-muted)]",
                )}
              >
                {step}
              </span>
              <span
                className={cn(
                  "truncate text-[12.5px] font-medium",
                  active ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]",
                )}
              >
                {label}
              </span>
              {idx === 0 && (
                <span
                  className={cn(
                    "h-px flex-1",
                    current > 1 ? "bg-[var(--color-primary)]" : "bg-[var(--color-line)]",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ApplyForm({
  posting,
  company,
  locale,
  translations,
  turnstileSiteKey,
}: ApplyFormProps) {
  const t = useCallback((key: TranslationKey): string => translations[key] ?? key, [translations]);

  const securityLabelId = useId();
  const formLoadedAt = useRef(Date.now());
  const [section2Visible, setSection2Visible] = useState(posting.hard_requirements.length === 0);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string | undefined>();
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const turnstileResolver = useRef<((token: string | null) => void) | null>(null);
  const section2Ref = useRef<HTMLDivElement>(null);

  const sortedRequirements = [...posting.hard_requirements].sort((a, b) => a.order - b.order);
  const hasRequirements = sortedRequirements.length > 0;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    setError,
  } = useForm<FormValues>({
    defaultValues: { requirements: {}, full_name: "", phone_number: "" },
  });

  const requirementValues = watch("requirements");
  const phoneRaw = watch("phone_number");

  function formatPhoneDisplay(raw: string): string {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return "";
    let result = "+";
    for (let i = 0; i < digits.length && i < 12; i++) {
      if (i === 3) result += " ";
      if (i === 5) result += " ";
      if (i === 8) result += "-";
      if (i === 10) result += "-";
      result += digits[i];
    }
    return result;
  }

  function handlePhoneChange(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target.value;
    let digits = input.replace(/\D/g, "");
    if (!digits.startsWith("998") && digits.length > 0) {
      if (digits.startsWith("8") && digits.length <= 10) {
        digits = "998" + digits.slice(1);
      } else if (!digits.startsWith("9")) {
        digits = "998" + digits;
      }
    }
    digits = digits.slice(0, 12);
    const raw = digits ? `+${digits}` : "";
    setValue("phone_number", raw, { shouldValidate: false });
  }

  // Turnstile initialization
  useEffect(() => {
    if (!turnstileSiteKey) return;

    const scriptId = "cf-turnstile-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    function renderWidget() {
      if (turnstileRef.current && window.turnstile && !turnstileRef.current.dataset.rendered) {
        turnstileRef.current.dataset.rendered = "true";
        const id = window.turnstile.render(turnstileRef.current, {
          sitekey: turnstileSiteKey,
          callback: (token: string) => {
            setTurnstileToken(token);
            turnstileResolver.current?.(token);
            turnstileResolver.current = null;
          },
          "expired-callback": () => setTurnstileToken(null),
          "error-callback": () => {
            turnstileResolver.current?.(null);
            turnstileResolver.current = null;
          },
        });
        turnstileWidgetId.current = id ?? null;
      }
    }

    if (window.turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if (window.turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [turnstileSiteKey]);

  useEffect(() => {
    if (retryCountdown === null || retryCountdown <= 0) return;
    const timer = setTimeout(() => setRetryCountdown(retryCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [retryCountdown]);

  // Requirement answers are NEVER a gate. We collect them as honest signals
  // and the server evaluates them. A mismatch means HR sees a red flag and AI
  // is skipped — but the candidate's submission still goes through, so we
  // don't show them any error styling for "wrong" answers here.
  function handleRequirementsCheck() {
    setSection2Visible(true);
    requestAnimationFrame(() => {
      section2Ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function executeTurnstile(): Promise<string | null> {
    const widgetId = turnstileWidgetId.current;
    if (!window.turnstile || !widgetId) return Promise.resolve(null);

    return new Promise<string | null>((resolve) => {
      const timer = setTimeout(() => {
        if (turnstileResolver.current === wrapped) {
          turnstileResolver.current = null;
          resolve(null);
        }
      }, 15_000);
      const wrapped = (token: string | null) => {
        clearTimeout(timer);
        resolve(token);
      };
      turnstileResolver.current = wrapped;
      try {
        window.turnstile!.reset(widgetId);
        window.turnstile!.execute(widgetId);
      } catch {
        clearTimeout(timer);
        turnstileResolver.current = null;
        resolve(null);
      }
    });
  }

  async function onSubmit(data: FormValues) {
    setApiError(null);

    if (!/^\+998\d{9}$/.test(data.phone_number)) {
      setError("phone_number", { message: t("apply.phone_hint") });
      return;
    }

    if (!cvFile) {
      setCvError(t("apply.cv.error_type"));
      return;
    }
    setCvError(undefined);

    setSubmitting(true);

    let token = turnstileToken;
    if (!token) token = await executeTurnstile();
    if (!token) {
      setApiError(t("apply.bot_detected"));
      setSubmitting(false);
      return;
    }

    const formData = new FormData();
    formData.append("token", posting.public_token);
    formData.append("full_name", data.full_name.trim());
    formData.append("phone_number", data.phone_number);
    formData.append("cv", cvFile);
    formData.append("requirement_answers", JSON.stringify(data.requirements));
    formData.append("form_loaded_at", String(formLoadedAt.current));
    formData.append("turnstile_token", token);

    const honeypotEl = document.querySelector<HTMLInputElement>('input[name="website"]');
    formData.append("website", honeypotEl?.value ?? "");

    try {
      const res = await fetch("/api/apply", { method: "POST", body: formData });

      if (res.ok) {
        setSuccess(true);
        return;
      }

      if (res.status === 429) {
        const retryAfter = Number(res.headers.get("Retry-After")) || 60;
        setRetryCountdown(retryAfter);
        setApiError(t("apply.too_many").replace("{seconds}", String(retryAfter)));
      } else if (res.status === 403) {
        setApiError(t("apply.bot_detected"));
      } else if (res.status === 400) {
        setApiError(t("apply.validation_failed"));
      } else {
        setApiError(t("apply.error_generic"));
      }
    } catch {
      setApiError(t("apply.error_generic"));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return <SuccessState locale={locale} t={t} />;
  }

  const hasDescription = posting.description.trim().length > 0;
  const currentStep: 1 | 2 = section2Visible ? 2 : 1;

  return (
    <div className="flex flex-col gap-4">
      {/* Company identity + trust hero */}
      <Card>
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={company.name}
                className="h-11 w-11 rounded-[var(--radius-md)] border border-[var(--color-line)] object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-container)] text-[15px] font-semibold text-[var(--color-on-primary-container)]"
              >
                {company.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[14px] font-semibold text-[var(--color-text)]">
                {company.name}
              </p>
              <p className="data-mono mt-0.5 text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
                {t("apply.eyebrow_position")}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-[26px] leading-[1.15] font-bold tracking-[-0.02em] text-[var(--color-text)] sm:text-[32px]">
              {posting.title}
            </h1>
            <p className="max-w-prose text-[14.5px] leading-[1.6] text-[var(--color-text-muted)]">
              {t("apply.intro_subtitle")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <TrustChip icon={<Clock className="h-3.5 w-3.5" strokeWidth={1.75} />}>
              {t("apply.time_estimate")}
            </TrustChip>
            <TrustChip icon={<ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />}>
              {t("apply.privacy_note")}
            </TrustChip>
          </div>
        </div>
      </Card>

      {/* Description */}
      {hasDescription && (
        <Panel>
          <PanelHeader>
            <PanelTitle>{t("apply.description_heading")}</PanelTitle>
          </PanelHeader>
          <JobDescription text={posting.description} className="px-5 py-5 sm:px-6" />
        </Panel>
      )}

      {/* Top-level banner — only generic API errors now; requirement answers
          never block submission, so they never appear here. */}
      {apiError && (
        <Alert tone="danger" title={apiError}>
          {t("apply.error_retry_hint")}
        </Alert>
      )}

      {retryCountdown !== null && retryCountdown > 0 && (
        <Alert tone="warning">
          {t("apply.too_many").replace("{seconds}", String(retryCountdown))}
        </Alert>
      )}

      {hasRequirements && (
        <StepProgress
          current={currentStep}
          labels={[t("apply.step_requirements"), t("apply.step_details")]}
          progressLabel={t("apply.step_progress")
            .replace("{current}", String(currentStep))
            .replace("{total}", "2")}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {/* Requirements */}
        {hasRequirements && (
          <Panel>
            <PanelHeader>
              <PanelTitle count={sortedRequirements.length}>
                {t("apply.requirements_heading")}
              </PanelTitle>
            </PanelHeader>
            <fieldset disabled={section2Visible && !submitting} className="px-5 py-5 sm:px-6">
              <div className="space-y-5">
                {sortedRequirements.map((req) => {
                  const label =
                    locale === "uz"
                      ? req.label_uz
                      : locale === "en"
                        ? req.label_en || req.label_ru
                        : req.label_ru;

                  // No "wrong answer" styling — answers never block submission.
                  // The candidate's threshold (min_value) is intentionally hidden.
                  if (req.type === "boolean") {
                    return (
                      <div key={req.id} className="space-y-2">
                        <p className="text-[13.5px] font-semibold tracking-[-0.005em] text-[var(--color-text)]">
                          {label}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["true", "false"] as const).map((val) => {
                            const selected = requirementValues[req.id] === val;
                            return (
                              <label
                                key={val}
                                className={cn(
                                  "flex h-12 cursor-pointer items-center justify-center rounded-[var(--radius-md)] border text-[14px] font-medium transition-colors",
                                  selected
                                    ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                                    : "border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:border-[var(--color-line-strong)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]",
                                )}
                              >
                                <input
                                  type="radio"
                                  className="sr-only"
                                  value={val}
                                  {...register(`requirements.${req.id}`)}
                                />
                                {val === "true" ? t("apply.yes") : t("apply.no")}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Input
                      key={req.id}
                      label={label}
                      inputSize="lg"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      {...register(`requirements.${req.id}`)}
                    />
                  );
                })}
              </div>

              {!section2Visible && (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={handleRequirementsCheck}
                  className="mt-6 font-semibold"
                >
                  {t("apply.continue")}
                </Button>
              )}
            </fieldset>
          </Panel>
        )}

        {/* Personal info */}
        <div
          ref={section2Ref}
          className={cn(
            "transition-all duration-300 ease-out motion-reduce:transition-none",
            section2Visible
              ? "max-h-[2400px] opacity-100"
              : "pointer-events-none max-h-0 overflow-hidden opacity-0",
          )}
          // `inert` (not aria-hidden) so the collapsed fields leave the tab order
          // and the accessibility tree until the requirements step is completed.
          inert={!section2Visible ? true : undefined}
        >
          <Panel>
            <PanelHeader>
              <PanelTitle>{t("apply.personal_heading")}</PanelTitle>
            </PanelHeader>
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <Input
                label={t("apply.full_name")}
                required
                inputSize="lg"
                autoComplete="name"
                error={errors.full_name?.message}
                {...register("full_name", {
                  required: t("apply.validation_failed"),
                  minLength: { value: 1, message: t("apply.validation_failed") },
                  maxLength: { value: 200, message: t("apply.validation_failed") },
                })}
              />

              <Input
                label={t("apply.phone_number")}
                required
                inputSize="lg"
                helperText={t("apply.phone_hint")}
                error={errors.phone_number?.message}
                value={formatPhoneDisplay(phoneRaw)}
                onChange={handlePhoneChange}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+998"
              />

              <div>
                <p className="mb-1.5 flex items-center gap-1 text-sm font-medium text-[var(--color-text)]">
                  {t("apply.upload_cv")}
                  <span className="text-[var(--color-danger)]" aria-hidden="true">
                    *
                  </span>
                </p>
                <CvDropzone t={t} value={cvFile} onChange={setCvFile} error={cvError} />
              </div>

              {/* Security verification (Cloudflare Turnstile). The widget renders
                  into the ref below; the heading/hint only show when configured.
                  The container is only labelled as a group when a widget exists,
                  so an empty placeholder div never carries an orphan aria-label. */}
              <div className="flex flex-col gap-2">
                {turnstileSiteKey && (
                  <div className="flex items-start gap-2">
                    <ShieldCheck
                      className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-subtle)]"
                      strokeWidth={1.75}
                      aria-hidden="true"
                    />
                    <div className="flex flex-col gap-0.5">
                      <p
                        id={securityLabelId}
                        className="text-[12.5px] font-semibold text-[var(--color-text)]"
                      >
                        {t("apply.security_label")}
                      </p>
                      <p className="text-[12px] leading-[1.5] text-[var(--color-text-muted)]">
                        {t("apply.security_hint")}
                      </p>
                    </div>
                  </div>
                )}
                <div
                  ref={turnstileRef}
                  {...(turnstileSiteKey
                    ? { role: "group", "aria-labelledby": securityLabelId }
                    : {})}
                />
              </div>

              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                style={{ position: "absolute", left: "-9999px" }}
                aria-hidden="true"
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={submitting}
                className="font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {t("apply.sending")}
                  </>
                ) : (
                  t("apply.submit")
                )}
              </Button>

              <p className="text-center text-[12px] leading-relaxed text-[var(--color-text-subtle)]">
                {t("apply.footer_note")}
              </p>
            </div>
          </Panel>
        </div>
      </form>
    </div>
  );
}

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback": () => void;
          "error-callback"?: () => void;
        },
      ) => string | undefined;
      execute: (widgetIdOrContainer: string | HTMLElement) => void;
      reset: (widgetIdOrContainer?: string | HTMLElement) => void;
    };
  }
}
