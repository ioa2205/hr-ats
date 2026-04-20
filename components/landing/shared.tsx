"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode } from "react";
import "./landing.css";
import { setLocale as setLocaleAction } from "@/lib/i18n/actions";
import { useTranslation } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/types";
import { Icon, Wordmark } from "./mockups";

export const TELEGRAM_URL = "https://t.me/ibodullo";
export const SIGNUP_HREF = "/auth/signup";
export const LOGIN_HREF = "/auth/login";

const LOCALE_CODES: { code: Locale; label: string }[] = [
  { code: "ru", label: "RU" },
  { code: "uz", label: "UZ" },
  { code: "en", label: "EN" },
];

export function useLocaleChanger() {
  const router = useRouter();
  const { locale } = useTranslation();
  const [, startTransition] = useTransition();
  const onChange = (next: Locale) => {
    if (next === locale) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };
  return { locale, onChange };
}

export function LocaleToggle({
  current,
  onChange,
  size = "md",
}: {
  current: Locale;
  onChange: (l: Locale) => void;
  size?: "sm" | "md";
}) {
  const small = size === "sm";
  return (
    <div
      style={{
        display: "inline-flex",
        border: "1px solid var(--ink)",
        fontFamily: "var(--font-jetbrains-mono),monospace",
        fontSize: 11,
        letterSpacing: "0.1em",
      }}
    >
      {LOCALE_CODES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          onClick={() => onChange(code)}
          style={{
            padding: small ? "5px 10px" : "6px 10px",
            background: current === code ? "var(--ink)" : "transparent",
            color: current === code ? "var(--paper-3)" : "var(--ink)",
            border: 0,
            cursor: "pointer",
            borderRight: code !== "en" ? "1px solid var(--ink)" : "0",
            fontFamily: "var(--font-jetbrains-mono),monospace",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function PublicHeader({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
}) {
  const { t } = useTranslation();
  return (
    <header
      style={{
        borderBottom: "1px solid var(--ink)",
        background: "var(--paper)",
      }}
      className="paper-grain"
    >
      <nav
        style={{
          maxWidth: 1360,
          margin: "0 auto",
          padding: "18px 28px",
          display: "flex",
          alignItems: "center",
          gap: 32,
        }}
      >
        <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
          <Wordmark size={28} />
        </Link>
        <div
          style={{
            display: "flex",
            gap: 26,
            fontSize: 13,
            color: "var(--ink-2)",
            fontWeight: 500,
          }}
        >
          <Link href="/#how">{t("landing.nav.how")}</Link>
          <Link href="/#features">{t("landing.nav.ai")}</Link>
          <Link href="/#pricing">{t("landing.nav.pricing")}</Link>
          <Link href="/contact">{t("landing.nav.contact")}</Link>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 14 }}>
          <LocaleToggle current={locale} onChange={onLocaleChange} />
          <Link
            href={LOGIN_HREF}
            style={{
              padding: "8px 14px",
              fontSize: 13,
              border: "1px solid var(--ink)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {t("landing.nav.signin")}
          </Link>
          <Link
            href={SIGNUP_HREF}
            className="btn-primary"
            style={{
              padding: "9px 16px",
              fontSize: 13,
              boxShadow: "3px 3px 0 var(--persimmon)",
            }}
          >
            {t("landing.nav.cta")}
          </Link>
        </div>
      </nav>
    </header>
  );
}

interface FooterLink {
  label: string;
  href: string;
}

function FooterCol({ title, items }: { title: string; items: FooterLink[] }) {
  return (
    <div>
      <div
        className="mono"
        style={{ fontSize: 10, letterSpacing: "0.2em", color: "var(--ink-3)", marginBottom: 14 }}
      >
        {title}
      </div>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {items.map((item) => (
          <li key={item.href} className="serif" style={{ fontSize: 18, letterSpacing: "-0.01em" }}>
            <Link href={item.href}>{item.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PublicFooter({
  locale,
  onLocaleChange,
}: {
  locale: Locale;
  onLocaleChange: (l: Locale) => void;
}) {
  const { t } = useTranslation();
  return (
    <footer
      id="contact"
      style={{
        position: "relative",
        padding: "48px 28px 32px",
        background: "var(--paper-2)",
        borderTop: "2px solid var(--ink)",
      }}
    >
      <div style={{ maxWidth: 1360, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1.2fr",
            gap: 36,
            alignItems: "flex-start",
          }}
        >
          <div>
            <Wordmark size={36} />
            <p
              className="serif"
              style={{
                fontStyle: "italic",
                fontSize: 16,
                color: "var(--ink-3)",
                margin: "14px 0 0",
                maxWidth: 320,
                lineHeight: 1.45,
              }}
            >
              {t("landing.footer.tagline")}
            </p>
          </div>
          <FooterCol
            title={t("landing.footer.col_product")}
            items={[
              { label: t("landing.footer.prod_features"), href: "/#features" },
              { label: t("landing.footer.prod_pricing"), href: "/#pricing" },
            ]}
          />
          <FooterCol
            title={t("landing.footer.col_company")}
            items={[
              { label: t("landing.footer.comp_about"), href: "/about" },
              { label: t("landing.footer.comp_contact"), href: "/contact" },
            ]}
          />
          <FooterCol
            title={t("landing.footer.col_legal")}
            items={[
              { label: t("landing.footer.legal_terms"), href: "/terms" },
              { label: t("landing.footer.legal_privacy"), href: "/privacy" },
            ]}
          />
          <div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                color: "var(--ink-3)",
                marginBottom: 12,
              }}
            >
              {t("landing.footer.col_contact")}
            </div>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                background: "var(--ink)",
                color: "var(--paper-3)",
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              <Icon.telegram size={16} /> Telegram
            </a>
            <div
              className="serif"
              style={{
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--ink-3)",
                marginTop: 12,
              }}
            >
              {t("landing.footer.telegram_hours")}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 48,
            paddingTop: 20,
            borderTop: "1px solid var(--ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: "var(--font-jetbrains-mono),monospace",
            fontSize: 11,
            letterSpacing: "0.1em",
            color: "var(--ink-3)",
          }}
        >
          <span>{t("landing.footer.copy")}</span>
          <span
            className="serif"
            style={{
              fontStyle: "italic",
              fontSize: 14,
              letterSpacing: "-0.01em",
              color: "var(--ink-3)",
            }}
          >
            {t("landing.footer.motto")}
          </span>
          <LocaleToggle current={locale} onChange={onLocaleChange} size="sm" />
        </div>
      </div>
    </footer>
  );
}

export function PublicShell({ children }: { children: ReactNode }) {
  const { locale, onChange } = useLocaleChanger();
  return (
    <div className="tezhr-landing">
      <PublicHeader locale={locale} onLocaleChange={onChange} />
      {children}
      <PublicFooter locale={locale} onLocaleChange={onChange} />
    </div>
  );
}
