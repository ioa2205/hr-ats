"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type InputHTMLAttributes,
} from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import type { HardRequirement } from "@/types";
import { cn } from "@/lib/utils";
import { Panel, PanelHeader, PanelTitle, TezButton } from "@/components/hr/design";
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

interface TezFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
}

const TezField = forwardRef<HTMLInputElement, TezFieldProps>(
  ({ label, helper, error, required, className, id, ...rest }, ref) => {
    const fieldId = id ?? `f-${label.toLowerCase().replace(/\s+/g, "-")}`;
    return (
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={fieldId}
          className="text-ink text-[13.5px] font-semibold tracking-[-0.005em]"
        >
          {label}
          {required && (
            <span className="text-persimmon ml-1" aria-hidden>
              *
            </span>
          )}
        </label>
        <input
          ref={ref}
          id={fieldId}
          {...rest}
          className={cn(
            "border-rule bg-paper text-ink placeholder:text-ink-5 flex h-[44px] w-full items-center rounded-[6px] border px-3.5 text-[14.5px] transition-colors",
            "focus:border-ink focus:outline-none",
            error && "border-persimmon focus:border-persimmon",
            className,
          )}
        />
        {error ? (
          <p className="text-persimmon text-[12.5px]" role="alert">
            {error}
          </p>
        ) : helper ? (
          <p className="text-ink-4 text-[12.5px]">{helper}</p>
        ) : null}
      </div>
    );
  },
);
TezField.displayName = "TezField";

export function ApplyForm({
  posting,
  company,
  locale,
  translations,
  turnstileSiteKey,
}: ApplyFormProps) {
  const t = useCallback((key: TranslationKey): string => translations[key] ?? key, [translations]);

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

  return (
    <div className="flex flex-col gap-4">
      {/* Hero */}
      <Panel>
        <div className="px-5 pb-6 pt-5 sm:px-6 sm:pb-7 sm:pt-6">
          <div className="mb-5 flex items-center gap-3">
            {company.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={company.logo_url}
                alt={company.name}
                className="border-rule h-10 w-10 rounded-[5px] border object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="bg-ink text-paper flex h-10 w-10 items-center justify-center rounded-[5px] text-[13px] font-semibold"
              >
                {company.name.slice(0, 1).toUpperCase()}
              </div>
            )}
            <div className="leading-tight">
              <p className="text-ink text-[14px] font-semibold tracking-[-0.005em]">
                {company.name}
              </p>
              <p
                className="text-ink-4 mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {t("apply.eyebrow_position")}
              </p>
            </div>
          </div>
          <h1 className="text-ink mb-3 text-[28px] font-bold leading-[1.15] tracking-[-0.02em] sm:text-[34px]">
            {posting.title}
          </h1>
          <p className="text-ink-3 max-w-prose text-[14.5px] leading-[1.6]">
            {t("apply.intro_subtitle")}
          </p>
        </div>
      </Panel>

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
        <div
          className="border-persimmon bg-persimmon-tint rounded-[5px] border px-4 py-3"
          role="alert"
        >
          <p className="text-persimmon-2 text-[13.5px] font-semibold">{apiError}</p>
        </div>
      )}

      {retryCountdown !== null && retryCountdown > 0 && (
        <div className="border-rule-2 bg-bone-2 rounded-[5px] border px-4 py-3" role="alert">
          <p className="text-ink-2 text-[13.5px]">
            {t("apply.too_many").replace("{seconds}", String(retryCountdown))}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        {/* Requirements */}
        {sortedRequirements.length > 0 && (
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
                        <p className="text-ink text-[13.5px] font-semibold tracking-[-0.005em]">
                          {label}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {(["true", "false"] as const).map((val) => {
                            const selected = requirementValues[req.id] === val;
                            return (
                              <label
                                key={val}
                                className={cn(
                                  "flex h-12 cursor-pointer items-center justify-center rounded-[6px] border text-[14px] font-medium transition-all",
                                  selected
                                    ? "border-ink bg-ink text-paper"
                                    : "border-rule bg-paper text-ink-3 hover:border-ink-6 hover:text-ink",
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
                    <TezField
                      key={req.id}
                      label={label}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      {...register(`requirements.${req.id}`)}
                    />
                  );
                })}
              </div>

              {!section2Visible && (
                <TezButton
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleRequirementsCheck}
                  className="mt-6 h-12 w-full justify-center text-[14.5px] font-semibold"
                >
                  {t("apply.continue")}
                </TezButton>
              )}
            </fieldset>
          </Panel>
        )}

        {/* Personal info */}
        <div
          ref={section2Ref}
          className={cn(
            "transition-all duration-300 ease-out",
            section2Visible
              ? "max-h-[2400px] opacity-100"
              : "pointer-events-none max-h-0 overflow-hidden opacity-0",
          )}
          aria-hidden={!section2Visible}
        >
          <Panel>
            <PanelHeader>
              <PanelTitle>{t("apply.personal_heading")}</PanelTitle>
            </PanelHeader>
            <div className="space-y-5 px-5 py-5 sm:px-6">
              <TezField
                label={t("apply.full_name")}
                required
                autoComplete="name"
                error={errors.full_name?.message}
                {...register("full_name", {
                  required: t("apply.validation_failed"),
                  minLength: { value: 1, message: t("apply.validation_failed") },
                  maxLength: { value: 200, message: t("apply.validation_failed") },
                })}
              />

              <TezField
                label={t("apply.phone_number")}
                required
                helper={t("apply.phone_hint")}
                error={errors.phone_number?.message}
                value={formatPhoneDisplay(phoneRaw)}
                onChange={handlePhoneChange}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+998"
              />

              <div>
                <p className="text-ink mb-1.5 text-[13.5px] font-semibold tracking-[-0.005em]">
                  {t("apply.upload_cv")}
                  <span className="text-persimmon ml-1" aria-hidden>
                    *
                  </span>
                </p>
                <CvDropzone t={t} value={cvFile} onChange={setCvFile} error={cvError} />
              </div>

              <div ref={turnstileRef} aria-label="Security verification" />

              <input
                name="website"
                tabIndex={-1}
                autoComplete="off"
                style={{ position: "absolute", left: "-9999px" }}
                aria-hidden="true"
              />

              <TezButton
                type="submit"
                variant="accent"
                size="lg"
                disabled={submitting}
                className="h-12 w-full justify-center text-[14.5px] font-semibold"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("apply.sending")}
                  </>
                ) : (
                  t("apply.submit")
                )}
              </TezButton>

              <p className="text-ink-5 text-center text-[12px] leading-relaxed">
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
