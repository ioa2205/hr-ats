"use client";

import { useActionState, useState, type CSSProperties } from "react";
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

const labelStyle: CSSProperties = {
  display: "block",
  marginBottom: 7,
  fontFamily: "var(--font-jetbrains-mono),monospace",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  fontSize: 15,
  background: "var(--paper)",
  border: "1px solid var(--rule-strong)",
  borderRadius: "var(--radius-md)",
  color: "var(--ink)",
  fontFamily: "var(--font-manrope),sans-serif",
  outline: "none",
};

function SubmitButton() {
  const { t } = useTranslation();
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending} style={{ opacity: pending ? 0.7 : 1, cursor: pending ? "progress" : "pointer" }}>
      {pending ? t("contact.form.sending") : t("contact.form.submit")}
    </button>
  );
}

function SuccessCard({ onReset }: { onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ paddingTop: 4 }}>
      <div className="lp-eyebrow is-accent mb-4">✓ {t("contact.form.kicker")}</div>
      <h2 className="lp-h2 m-0" style={{ fontSize: "clamp(28px,3vw+8px,40px)" }}>
        {t("contact.form.success_title")}
      </h2>
      <p className="mt-5 max-w-[460px] text-[16px] leading-[1.6]" style={{ color: "var(--ink-2)" }}>
        {t("contact.form.success_body")}
      </p>
      <button type="button" onClick={onReset} className="btn-ghost mt-7" style={{ minHeight: 40 }}>
        {t("contact.form.success_another")}
      </button>
    </div>
  );
}

function ContactForm({ onDone }: { onDone: () => void }) {
  const { t } = useTranslation();
  const [state, formAction] = useActionState<ContactState, FormData>(submitContactMessage, null);

  if (state?.ok) {
    return <SuccessCard onReset={onDone} />;
  }

  const errorKey = state?.error ? (ERR_KEYS[state.error] ?? "contact.form.err_generic") : null;

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="lp-eyebrow is-accent">{t("contact.form.kicker")}</div>
      <h2 className="lp-h3 m-0" style={{ fontSize: 26 }}>
        {t("contact.form.title")}
      </h2>

      <div>
        <label htmlFor="contact-name" style={labelStyle}>
          {t("contact.form.name_label")}
        </label>
        <input id="contact-name" name="name" type="text" required minLength={2} maxLength={120} placeholder={t("contact.form.name_placeholder")} style={inputStyle} />
      </div>

      <div>
        <label htmlFor="contact-email" style={labelStyle}>
          {t("contact.form.email_label")}
        </label>
        <input id="contact-email" name="email" type="email" required maxLength={200} placeholder={t("contact.form.email_placeholder")} style={inputStyle} />
      </div>

      <div>
        <label htmlFor="contact-company" style={labelStyle}>
          {t("contact.form.company_label")} ({t("contact.form.company_optional")})
        </label>
        <input id="contact-company" name="company" type="text" maxLength={120} placeholder={t("contact.form.company_placeholder")} style={inputStyle} />
      </div>

      <div>
        <label htmlFor="contact-message" style={labelStyle}>
          {t("contact.form.message_label")}
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          maxLength={2000}
          rows={6}
          placeholder={t("contact.form.message_placeholder")}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }}
        />
        <div className="mt-1.5 text-[12px]" style={{ color: "var(--ink-4)" }}>
          {t("contact.form.message_hint")}
        </div>
      </div>

      {errorKey && (
        <div role="alert" className="rounded-lg px-3.5 py-2.5 text-[13px] leading-[1.45]" style={{ background: "var(--color-danger-container)", color: "var(--color-danger)" }}>
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
    <section className="relative" style={{ background: "var(--paper)", padding: "clamp(48px, 6vw, 80px) 24px clamp(80px, 9vw, 120px)" }}>
      <div className="mx-auto" style={{ maxWidth: 1100 }}>
        <div className="lp-eyebrow is-accent mb-6">{t("contact.kicker")}</div>
        <h1 className="lp-display" style={{ margin: 0, maxWidth: 900 }}>
          {t("contact.title_a")} <span className="lp-accent">{t("contact.title_b")}</span>
        </h1>
        <p className="lp-lede" style={{ marginTop: 28, maxWidth: 640 }}>
          {t("contact.subtitle")}
        </p>

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-[1.25fr_1fr]">
          <div className="lp-panel" style={{ padding: "32px 30px" }}>
            <ContactForm key={formKey} onDone={() => setFormKey((k) => k + 1)} />
          </div>

          <div
            className="flex flex-col rounded-2xl p-8"
            style={{ background: "var(--night)", color: "var(--on-night)", boxShadow: "var(--shadow-level-2)" }}
          >
            <div className="mono" style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#8fc2f5" }}>
              {t("contact.telegram.kicker")}
            </div>
            <h3 className="lp-h2 mt-3.5" style={{ margin: 0, fontSize: "clamp(26px,3vw+8px,36px)", color: "var(--on-night)" }}>
              {t("contact.telegram.title")}
            </h3>
            <p className="mt-4 text-[16px] leading-[1.6]" style={{ color: "var(--on-night-muted)" }}>
              {t("contact.telegram.body")}
            </p>
            <div className="mt-auto pt-9">
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ minHeight: 44 }}
              >
                <Icon.telegram size={16} color="var(--color-on-primary)" />
                {t("contact.telegram.cta")}
              </a>
              <div className="mono mt-4" style={{ fontSize: 11, letterSpacing: "0.08em", color: "var(--on-night-muted)" }}>
                {t("contact.telegram.hours")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
