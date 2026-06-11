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
  invalid_phone: "auth.phone_hint",
  otp_rate_limited: "auth.otp_rate_limited",
  phone_taken: "auth.phone_taken",
  sms_failed: "auth.sms_failed",
  invalid_input: "auth.signup_invalid_input",
  otp_expired: "auth.otp_expired",
  otp_invalid_code: "auth.otp_invalid",
  otp_invalid: "auth.otp_invalid",
  otp_too_many_attempts: "auth.otp_too_many_attempts",
  otp_not_found: "auth.otp_not_found",
  email_taken: "auth.signup_email_taken",
  signup_failed: "auth.signup_generic_failed",
};

const RESEND_COOLDOWN = 60;

function Spin() {
  return (
    <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
  );
}

const linkButtonClass =
  "rounded-[var(--radius-sm)] font-medium text-[var(--color-text-muted)] underline-offset-2 transition-colors hover:text-[var(--color-text)] hover:underline disabled:opacity-50";

export function PhoneOtpForm() {
  const { t } = useTranslation();
  const router = useRouter();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

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
    const normalizedPhone = phone.trim().replace(/[\s-]/g, "");
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
        body: JSON.stringify({ action: "complete", phone, email, full_name: fullName }),
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
      {errorKeys[error] ? t(errorKeys[error]) : t("auth.signup_generic_failed")}
    </AuthBanner>
  ) : null;

  // ── STEP: phone ─────────────────────────────────────────────────
  if (step === "phone") {
    return (
      <form onSubmit={handlePhoneSubmit} className="flex flex-col gap-4">
        {errorNode}

        <AuthField
          label={t("auth.phone_number")}
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          placeholder={t("auth.phone_hint")}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          helper={t("auth.phone_digit_hint")}
        />

        <Button type="submit" size="lg" fullWidth disabled={loading} className="mt-1">
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
          {t("auth.enter_code_desc", { phone })}
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
            <button type="button" onClick={handleResend} disabled={loading} className={linkButtonClass}>
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
        placeholder="Jane Doe"
      />

      <AuthField
        label={t("auth.email")}
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        helper={t("auth.phone_email_hint")}
        placeholder="you@example.com"
      />

      <Button type="submit" size="lg" fullWidth disabled={loading} className="mt-1">
        {loading && <Spin />}
        {loading ? t("auth.creating_account") : t("auth.complete_signup")}
      </Button>
    </form>
  );
}
