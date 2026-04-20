"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { TELEGRAM_URL } from "./shared";
import { Icon } from "./mockups";

type Kind = "terms" | "privacy";

interface LegalKeys {
  kicker: TranslationKey;
  title: TranslationKey;
  updated: TranslationKey;
  intro_p1: TranslationKey;
  intro_p2: TranslationKey;
  topics_label: TranslationKey;
  topics: TranslationKey[];
  contact_note: TranslationKey;
}

const KEYS: Record<Kind, LegalKeys> = {
  terms: {
    kicker: "legal.terms.kicker",
    title: "legal.terms.title",
    updated: "legal.terms.updated",
    intro_p1: "legal.terms.intro_p1",
    intro_p2: "legal.terms.intro_p2",
    topics_label: "legal.terms.topics_label",
    topics: [
      "legal.terms.topic_1",
      "legal.terms.topic_2",
      "legal.terms.topic_3",
      "legal.terms.topic_4",
      "legal.terms.topic_5",
    ],
    contact_note: "legal.terms.contact_note",
  },
  privacy: {
    kicker: "legal.privacy.kicker",
    title: "legal.privacy.title",
    updated: "legal.privacy.updated",
    intro_p1: "legal.privacy.intro_p1",
    intro_p2: "legal.privacy.intro_p2",
    topics_label: "legal.privacy.topics_label",
    topics: [
      "legal.privacy.topic_1",
      "legal.privacy.topic_2",
      "legal.privacy.topic_3",
      "legal.privacy.topic_4",
      "legal.privacy.topic_5",
    ],
    contact_note: "legal.privacy.contact_note",
  },
};

export function LegalContent({ kind }: { kind: Kind }) {
  const { t } = useTranslation();
  const k = KEYS[kind];

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
        <span>{t(k.kicker)}</span>
        <span>{t(k.updated)}</span>
      </div>

      <section
        className="paper-grain"
        style={{ background: "var(--paper)", padding: "72px 28px 80px" }}
      >
        <div style={{ maxWidth: 880, margin: "0 auto" }}>
          <h1
            className="serif"
            style={{
              margin: 0,
              fontSize: 88,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              fontWeight: 400,
            }}
          >
            {t(k.title)}
          </h1>
          <div
            className="mono"
            style={{
              marginTop: 18,
              fontSize: 11,
              letterSpacing: "0.16em",
              color: "var(--ink-3)",
            }}
          >
            {t(k.updated)}
          </div>

          <p
            style={{
              margin: "36px 0 0",
              fontSize: 17,
              lineHeight: 1.6,
              color: "var(--ink-2)",
            }}
          >
            {t(k.intro_p1)}
          </p>
          <p
            style={{
              margin: "18px 0 0",
              fontSize: 17,
              lineHeight: 1.6,
              color: "var(--ink-2)",
            }}
          >
            {t(k.intro_p2)}
          </p>

          <div
            style={{
              marginTop: 56,
              borderTop: "1px solid var(--ink)",
              paddingTop: 20,
              display: "flex",
              alignItems: "baseline",
              gap: 14,
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.2em",
                color: "var(--persimmon-2)",
              }}
            >
              {t(k.topics_label)}
            </span>
          </div>

          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: "24px 0 0",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {k.topics.map((key, i) => (
              <li
                key={key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "48px 1fr",
                  gap: 18,
                  padding: "22px 0",
                  borderTop: i === 0 ? "0" : "1px dashed var(--ink-4)",
                  alignItems: "baseline",
                }}
              >
                <span
                  className="serif"
                  style={{
                    fontStyle: "italic",
                    fontSize: 28,
                    color: "var(--persimmon-2)",
                    lineHeight: 1,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    lineHeight: 1.55,
                    color: "var(--ink-2)",
                  }}
                >
                  {t(key)}
                </p>
              </li>
            ))}
          </ol>

          <div
            style={{
              marginTop: 56,
              padding: "28px 28px",
              background: "var(--paper-2)",
              border: "1.5px solid var(--ink)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              flexWrap: "wrap",
            }}
          >
            <p
              className="serif"
              style={{
                margin: 0,
                fontStyle: "italic",
                fontSize: 17,
                color: "var(--ink-3)",
                maxWidth: 520,
                lineHeight: 1.5,
              }}
            >
              {t(k.contact_note)}
            </p>
            <div style={{ display: "inline-flex", gap: 10 }}>
              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: "10px 14px",
                  background: "var(--ink)",
                  color: "var(--paper-3)",
                  fontSize: 13,
                  fontWeight: 500,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  textDecoration: "none",
                }}
              >
                <Icon.telegram size={14} /> Telegram
              </a>
              <Link
                href="/contact"
                style={{
                  padding: "10px 14px",
                  border: "1.5px solid var(--ink)",
                  color: "var(--ink)",
                  fontSize: 13,
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                /contact
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
