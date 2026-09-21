"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthField } from "./auth-field";
import { AuthBanner } from "./auth-banner";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { logger } from "@/lib/logger";

type Step = "phone" | "otp" | "details";

const errorKeys: Record<string, TranslationKey> = {
  invalid_phone: "auth.phone_invalid",
  otp_rate_limited: "auth.otp_rate_limited",
  phone_taken: "auth.phone_taken",
  sms_failed: "auth.sms_failed",
  sms_unavailable: "auth.sms_unavailable",
  invalid_input: "auth.signup_invalid_input",
  otp_expired: "auth.otp_expired",
  otp_invalid_code: "auth.otp_invalid",
  otp_invalid: "auth.otp_invalid",
  otp_too_many_attempts: "auth.otp_too_many_attempts",
  otp_not_found: "auth.otp_not_found",
  otp_not_verified: "auth.otp_not_verified",
  email_taken: "auth.signup_email_taken",
  signup_failed: "auth.signup_generic_failed",
};

const RESEND_COOLDOWN = 60;

function Spin() {
  return <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />;
}

const linkButtonClass =
  "rounded-[var(--radius-sm)] font-medium text-[var(--color-text-muted)] underline-offset-2 transition-colors hover:text-[var(--color-text)] hover:underline disabled:opacity-50";

interface PhoneOtpFormProps {
  nextPath?: string;
  pinnedEmail?: string;
}

function toUzbekPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("998")) digits = digits.slice(3);
  return `+998${digits.slice(0, 9)}`;
}

function formatUzbekPhone(phone: string): string {
  const digits = phone.replace(/^\+998/, "");
  if (digits.length !== 9) return phone;
  return `+998 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7)}`;
}

export function PhoneOtpForm({ nextPath, pinnedEmail }: PhoneOtpFormProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState(pinnedEmail ?? "");
  const [fullName, setFullName] = useState("");
  const [verificationTicket, setVerificationTicket] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((prev) => prev - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  const sendOtp = useCallback(async (phoneNumber: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup-phone/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRetryAfter(typeof data.retryAfter === "number" ? data.retryAfter : null);
        setError(data.error ?? "sms_failed");
        return false;
      }
      setResendTimer(RESEND_COOLDOWN);
      return true;
    } catch (err) {
      logger.error({ err }, "[phone-otp] send failed");
      setError("sms_failed");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  async function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    const normalizedPhone = toUzbekPhone(phone);
    if (!/^\+998\d{9}$/.test(normalizedPhone)) {
      setError("invalid_phone");
      return;
    }
    setPhone(normalizedPhone);
    const ok = await sendOtp(normalizedPhone);
    if (ok) setStep("otp");
  }

  async function handleOtpSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup-phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", phone, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "otp_invalid");
        return;
      }
      if (typeof data.verification_ticket !== "string") {
        setError("otp_not_verified");
        return;
      }
      setVerificationTicket(data.verification_ticket);
      setStep("details");
    } catch (err) {
      logger.error({ err }, "[phone-otp] verify failed");
      setError("otp_invalid");
    } finally {
      setLoading(false);
    }
  }

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup-phone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          phone,
          email,
          full_name: fullName,
          verification_ticket: verificationTicket,
          next: nextPath,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "signup_failed");
        return;
      }
      router.push(data.redirect ?? "/onboarding");
    } catch (err) {
      logger.error({ err }, "[phone-otp] complete failed");
      setError("signup_failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    await sendOtp(phone);
  }

  const errorNode = error ? (
    <AuthBanner tone="error">
      {errorKeys[error]
        ? t(
            errorKeys[error],
            error === "otp_rate_limited"
              ? { seconds: String(Math.max(1, retryAfter ?? 60)) }
              : undefined,
          )
        : t("auth.signup_generic_failed")}
    </AuthBanner>
  ) : null;

  // ── STEP: phone ─────────────────────────────────────────────────
  if (step === "phone") {
    return (
      <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
        {errorNode}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="phone-national"
            className="text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--color-text)]"
          >
            {t("auth.phone_number")}
          </label>
          <div
            className={`field-focus-ring flex h-[52px] items-center rounded-[12px] border bg-[var(--color-surface)] ${
              error === "invalid_phone"
                ? "border-[var(--color-danger)]"
                : "border-[var(--color-line-strong)]"
            }`}
          >
            <span className="border-r border-[var(--color-line)] px-4 text-[15px] font-semibold text-[var(--color-text)]">
              +998
            </span>
            <input
              id="phone-national"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              required
              maxLength={13}
              aria-invalid={error === "invalid_phone" || undefined}
              aria-describedby="phone-national-helper"
              placeholder={t("auth.phone_hint").replace("+998", "").trim()}
              value={phone.replace(/^\+998/, "")}
              onChange={(e) => {
                setPhone(toUzbekPhone(e.target.value));
                setError(null);
              }}
              className="h-full min-w-0 flex-1 bg-transparent px-4 text-[15px] text-[var(--color-text)] outline-none placeholder:text-[var(--color-text-subtle)]"
            />
          </div>
          <p id="phone-national-helper" className="text-[12.5px] text-[var(--color-text-muted)]">
            {t("auth.phone_digit_hint")}
          </p>
        </div>

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={loading || phone === "+998"}
          className="mt-1"
        >
          {loading && <Spin />}
          {loading ? t("auth.sending_code") : t("auth.send_code")}
        </Button>

        <p className="text-center text-[13px] text-[var(--color-text-muted)]">
          {t("auth.already_have_account")}
          <Link
            href="/auth/login"
            className="ml-1.5 font-semibold text-[var(--color-text)] underline-offset-2 hover:text-[var(--color-primary)] hover:underline"
          >
            {t("auth.sign_in")}
          </Link>
        </p>
      </form>
    );
  }

  // ── STEP: otp ──────────────────────────────────────────────────
  if (step === "otp") {
    return (
      <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
        {errorNode}

        <p className="text-[14px] leading-[1.55] text-[var(--color-text-muted)]">
          {t("auth.enter_code_desc", { phone: formatUzbekPhone(phone) })}
        </p>

        <AuthField
          label={t("auth.enter_code")}
          name="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 6);
            setCode(v);
          }}
          className="text-center text-[18px] tracking-[0.3em]"
          style={{ fontFamily: "var(--font-mono)" }}
        />

        <Button
          type="submit"
          size="lg"
          fullWidth
          disabled={loading || code.length !== 6}
          className="mt-1"
        >
          {loading && <Spin />}
          {loading ? t("auth.verifying") : t("auth.verify_code")}
        </Button>

        <div className="flex items-center justify-between text-[13px]">
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setCode("");
              setError(null);
            }}
            className={linkButtonClass}
          >
            {t("auth.phone_change_number")}
          </button>
          {resendTimer > 0 ? (
            <span className="data-mono text-[var(--color-text-subtle)]">
              {t("auth.resend_in", { seconds: String(resendTimer) })}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={loading}
              className={linkButtonClass}
            >
              {t("auth.resend_code")}
            </button>
          )}
        </div>
      </form>
    );
  }

  // ── STEP: details ──────────────────────────────────────────────
  return (
    <form onSubmit={handleDetailsSubmit} className="flex flex-col gap-4">
      {errorNode}

      <AuthBanner tone="success" icon={<Check className="h-4 w-4" strokeWidth={2.5} />}>
        {t("auth.phone_verified")}
      </AuthBanner>

      <p className="text-[14px] leading-[1.55] text-[var(--color-text-muted)]">
        {t("auth.complete_signup_desc")}
      </p>

      <AuthField
        label={t("auth.full_name")}
        name="full_name"
        type="text"
        autoComplete="name"
        required
        minLength={2}
        maxLength={120}
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        placeholder={t("auth.full_name_placeholder")}
      />

      <AuthField
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        readOnly={Boolean(pinnedEmail)}
        helper={pinnedEmail ? t("auth.email_locked") : t("auth.phone_email_hint")}
        placeholder="you@example.com"
      />

      <Button type="submit" size="lg" fullWidth disabled={loading} className="mt-1">
        {loading && <Spin />}
        {loading ? t("auth.creating_account") : t("auth.complete_signup")}
      </Button>
    </form>
  );
}
