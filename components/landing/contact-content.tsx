"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { submitContactMessage, type ContactState } from "@/lib/actions/contact";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { TELEGRAM_URL } from "./shared";
import { Icon } from "./mockups";

const ERR_KEYS: Record<string, TranslationKey> = {
  invalid_input: "contact.form.err_invalid",
  too_many: "contact.form.err_too_many",
  generic: "contact.form.err_generic",
};

function SubmitButton() {
  const { t } = useTranslation();
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="btn-primary"
      disabled={pending}
      style={{
        width: "100%",
        padding: "14px 18px",
        fontSize: 14,
        background: "var(--persimmon)",
        color: "var(--paper-3)",
        border: 0,
        cursor: pending ? "progress" : "pointer",
        fontFamily: "var(--font-manrope),sans-serif",
        fontWeight: 600,
        letterSpacing: "-0.005em",
        boxShadow: "4px 4px 0 var(--ink)",
        opacity: pending ? 0.7 : 1,
      }}
    >
      {pending ? t("contact.form.sending") : t("contact.form.submit")}
    </button>
  );
}

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 10,
        marginBottom: 6,
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          color: "var(--ink-3)",
          textTransform: "uppercase",
        }}
      >
        {children}
      </span>
      {hint && (
        <span
          className="serif"
          style={{
            fontStyle: "italic",
            fontSize: 12,
            color: "var(--ink-4)",
          }}
        >
          ({hint})
        </span>
      )}
    </label>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  fontSize: 15,
  background: "var(--paper-3)",
  border: "1.5px solid var(--ink)",
  color: "var(--ink)",
  fontFamily: "var(--font-manrope),sans-serif",
  outline: "none",
};

function SuccessCard({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ paddingTop: 10 }}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "var(--persimmon-2)",
          marginBottom: 14,
        }}
      >
        ✓ {t("contact.form.kicker")}
      </div>
      <h2
        className="serif"
        style={{
          margin: 0,
          fontSize: 56,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: "var(--ink)",
        }}
      >
        {t("contact.form.success_title")}
      </h2>
      <p
        style={{
          margin: "20px 0 0",
          fontSize: 16,
          lineHeight: 1.55,
          color: "var(--ink-2)",
          maxWidth: 460,
        }}
      >
        {t("contact.form.success_body")}
      </p>
      <button
        type="button"
        onClick={onReset}
        style={{
          marginTop: 28,
          padding: "10px 16px",
          background: "transparent",
          color: "var(--ink)",
          border: "1.5px solid var(--ink)",
          cursor: "pointer",
          fontFamily: "var(--font-manrope),sans-serif",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {t("contact.form.success_another")}
      </button>
    </div>
  );
}

function ContactForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [state, formAction] = useActionState<ContactState, FormData>(
    submitContactMessage,
    null,
  );

  if (state?.ok) {
    return <SuccessCard onReset={onDone} />;
  }

  const errorKey = state?.error ? ERR_KEYS[state.error] ?? "contact.form.err_generic" : null;

  return (
    <form
      action={formAction}
      style={{ display: "flex", flexDirection: "column", gap: 20 }}
    >
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.2em",
          color: "var(--persimmon-2)",
        }}
      >
        {t("contact.form.kicker")}
      </div>
      <h2
        className="serif"
        style={{
          margin: 0,
          fontSize: 36,
          lineHeight: 1.05,
          letterSpacing: "-0.025em",
        }}
      >
        {t("contact.form.title")}
      </h2>

      <div>
        <FieldLabel htmlFor="contact-name">{t("contact.form.name_label")}</FieldLabel>
        <input
          id="contact-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={120}
          placeholder={t("contact.form.name_placeholder")}
          style={inputStyle}
        />
      </div>

      <div>
        <FieldLabel htmlFor="contact-email">{t("contact.form.email_label")}</FieldLabel>
        <input
          id="contact-email"
          name="email"
          type="email"
          required
          maxLength={200}
          placeholder={t("contact.form.email_placeholder")}
          style={inputStyle}
        />
      </div>

      <div>
        <FieldLabel
          htmlFor="contact-company"
          hint={t("contact.form.company_optional")}
        >
          {t("contact.form.company_label")}
        </FieldLabel>
        <input
          id="contact-company"
          name="company"
          type="text"
          maxLength={120}
          placeholder={t("contact.form.company_placeholder")}
          style={inputStyle}
        />
      </div>

      <div>
        <FieldLabel htmlFor="contact-message">
          {t("contact.form.message_label")}
        </FieldLabel>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          placeholder={t("contact.form.message_placeholder")}
          style={{
            ...inputStyle,
            resize: "vertical",
            fontFamily: "var(--font-manrope),sans-serif",
            lineHeight: 1.55,
          }}
        />
        <div
          className="serif"
          style={{
            fontStyle: "italic",
            fontSize: 12,
            color: "var(--ink-4)",
            marginTop: 6,
          }}
        >
          {t("contact.form.message_hint")}
        </div>
      </div>

      {errorKey && (
        <div
          role="alert"
          style={{
            padding: "10px 14px",
            background: "var(--paper-2)",
            border: "1.5px solid var(--persimmon-2)",
            color: "var(--ink)",
            fontSize: 13,
            lineHeight: 1.45,
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "var(--persimmon-2)",
              marginRight: 8,
            }}
          >
            ERR
          </span>
          {t(errorKey)}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}

export function ContactContent() {
  const { t } = useTranslation();
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      {/* Masthead bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 28px",
          borderBottom: "1px solid var(--ink)",
          fontFamily: "var(--font-jetbrains-mono),monospace",
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "var(--ink-2)",
          background: "var(--paper)",
        }}
      >
        <span>{t("contact.kicker")}</span>
        <span>{t("contact.meta")}</span>
      </div>

      <section
        className="paper-grain"
        style={{
          position: "relative",
          background: "var(--paper)",
          padding: "72px 28px 120px",
        }}
      >
        <div style={{ maxWidth: 1360, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 20,
              marginBottom: 24,
              borderBottom: "2px solid var(--ink)",
              paddingBottom: 14,
            }}
          >
            <span
              className="serif"
              style={{ fontStyle: "italic", fontSize: 22, color: "var(--ink-3)" }}
            >
              — {t("contact.kicker")}
            </span>
          </div>

          <h1
            className="serif"
            style={{
              margin: "8px 0 0",
              fontSize: 120,
              lineHeight: 0.9,
              letterSpacing: "-0.045em",
              fontWeight: 400,
              color: "var(--ink)",
              maxWidth: 1100,
            }}
          >
            {t("contact.title_a")}
            <br />
            <em style={{ fontStyle: "italic", color: "var(--persimmon-2)" }}>
              {t("contact.title_b")}
            </em>
          </h1>

          <p
            style={{
              margin: "32px 0 0",
              maxWidth: 640,
              fontSize: 19,
              lineHeight: 1.55,
              color: "var(--ink-2)",
            }}
          >
            {t("contact.subtitle")}
          </p>

          <div
            style={{
              marginTop: 64,
              display: "grid",
              gridTemplateColumns: "1.25fr 1fr",
              gap: 40,
              alignItems: "stretch",
            }}
          >
            <div
              style={{
                background: "var(--paper-3)",
                border: "1.5px solid var(--ink)",
                padding: "36px 36px 32px",
                position: "relative",
                boxShadow: "10px 10px 0 var(--ink)",
              }}
            >
              <ContactForm key={formKey} onDone={() => setFormKey((k) => k + 1)} />
            </div>

            <div
              className="night-grain"
              style={{
                background: "var(--ink)",
                color: "var(--paper-3)",
                border: "1.5px solid var(--ink)",
                padding: "36px 32px 32px",
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.2em",
                  color: "var(--saffron)",
                }}
              >
                {t("contact.telegram.kicker")}
              </div>
              <h3
                className="serif"
                style={{
                  margin: "14px 0 0",
                  fontSize: 40,
                  lineHeight: 1.02,
                  letterSpacing: "-0.03em",
                }}
              >
                {t("contact.telegram.title")}
              </h3>
              <p
                className="serif"
                style={{
                  margin: "18px 0 0",
                  fontSize: 18,
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  color: "#C8C0B0",
                }}
              >
                {t("contact.telegram.body")}
              </p>

              <div style={{ marginTop: "auto", paddingTop: 36 }}>
                <a
                  href={TELEGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "14px 22px",
                    background: "var(--persimmon)",
                    color: "var(--paper-3)",
                    boxShadow: "6px 6px 0 var(--saffron)",
                    fontSize: 14,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  <Icon.telegram size={16} />
                  {t("contact.telegram.cta")}
                </a>
                <div
                  className="mono"
                  style={{
                    marginTop: 16,
                    fontSize: 11,
                    letterSpacing: "0.14em",
                    color: "#C8C0B0",
                  }}
                >
                  {t("contact.telegram.hours")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
