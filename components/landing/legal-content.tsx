"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import { TELEGRAM_URL } from "./constants";
import { TelegramIcon } from "./icons";

type Kind = "terms" | "privacy";
type LegalKeys = {
  kicker: TranslationKey;
  title: TranslationKey;
  updated: TranslationKey;
  intro: TranslationKey[];
  topicsLabel: TranslationKey;
  topics: TranslationKey[];
  contact: TranslationKey;
};

const KEYS: Record<Kind, LegalKeys> = {
  terms: {
    kicker: "legal.terms.kicker",
    title: "legal.terms.title",
    updated: "legal.terms.updated",
    intro: ["legal.terms.intro_p1", "legal.terms.intro_p2"],
    topicsLabel: "legal.terms.topics_label",
    topics: [
      "legal.terms.topic_1",
      "legal.terms.topic_2",
      "legal.terms.topic_3",
      "legal.terms.topic_4",
      "legal.terms.topic_5",
    ],
    contact: "legal.terms.contact_note",
  },
  privacy: {
    kicker: "legal.privacy.kicker",
    title: "legal.privacy.title",
    updated: "legal.privacy.updated",
    intro: ["legal.privacy.intro_p1", "legal.privacy.intro_p2"],
    topicsLabel: "legal.privacy.topics_label",
    topics: [
      "legal.privacy.topic_1",
      "legal.privacy.topic_2",
      "legal.privacy.topic_3",
      "legal.privacy.topic_4",
      "legal.privacy.topic_5",
    ],
    contact: "legal.privacy.contact_note",
  },
};

export function LegalContent({ kind }: { kind: Kind }) {
  const { t } = useTranslation();
  const k = KEYS[kind];
  return (
    <main id="main">
      <section className="craft-page-hero craft-page-hero-compact craft-paper">
        <div className="craft-container craft-legal-hero">
          <p className="craft-kicker">{t(k.kicker)}</p>
          <h1 className="craft-display craft-display-medium">{t(k.title)}</h1>
          <p className="craft-page-meta">{t(k.updated)}</p>
          <div className="craft-legal-intro">
            {k.intro.map((key) => (
              <p key={key}>{t(key)}</p>
            ))}
          </div>
        </div>
      </section>
      <section className="craft-page-body craft-paper-blue">
        <div className="craft-container">
          <p className="craft-kicker">{t(k.topicsLabel)}</p>
          <ol className="craft-numbered-list craft-legal-list">
            {k.topics.map((key, index) => (
              <li key={key}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>{t(key)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="craft-contact-note craft-paper-sun">
        <div className="craft-container craft-legal-contact">
          <p>{t(k.contact)}</p>
          <div>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="craft-button craft-button-coral"
            >
              <TelegramIcon size={16} />
              Telegram
            </a>
            <Link href="/contact" className="craft-text-link">
              {t("landing.nav.contact")} ↗
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
