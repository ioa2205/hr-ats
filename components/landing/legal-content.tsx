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
    topics: ["legal.terms.topic_1", "legal.terms.topic_2", "legal.terms.topic_3", "legal.terms.topic_4", "legal.terms.topic_5"],
    contact_note: "legal.terms.contact_note",
  },
  privacy: {
    kicker: "legal.privacy.kicker",
    title: "legal.privacy.title",
    updated: "legal.privacy.updated",
    intro_p1: "legal.privacy.intro_p1",
    intro_p2: "legal.privacy.intro_p2",
    topics_label: "legal.privacy.topics_label",
    topics: ["legal.privacy.topic_1", "legal.privacy.topic_2", "legal.privacy.topic_3", "legal.privacy.topic_4", "legal.privacy.topic_5"],
    contact_note: "legal.privacy.contact_note",
  },
};

export function LegalContent({ kind }: { kind: Kind }) {
  const { t } = useTranslation();
  const k = KEYS[kind];

  return (
    <section style={{ background: "var(--paper)", padding: "clamp(48px, 6vw, 80px) 24px clamp(72px, 8vw, 96px)" }}>
      <div className="mx-auto" style={{ maxWidth: 800 }}>
        <div className="lp-eyebrow is-accent mb-5">{t(k.kicker)}</div>
        <h1 className="lp-display" style={{ margin: 0, fontSize: "clamp(40px, 5vw + 12px, 64px)" }}>
          {t(k.title)}
        </h1>
        <div className="mono mt-4" style={{ fontSize: 11, letterSpacing: "0.1em", color: "var(--ink-4)" }}>
          {t(k.updated)}
        </div>

        <p className="mt-9 text-[16.5px] leading-[1.65]" style={{ color: "var(--ink-2)" }}>
          {t(k.intro_p1)}
        </p>
        <p className="mt-4 text-[16.5px] leading-[1.65]" style={{ color: "var(--ink-2)" }}>
          {t(k.intro_p2)}
        </p>

        <div className="mt-12 border-t pt-6" style={{ borderColor: "var(--rule)" }}>
          <span className="lp-eyebrow">{t(k.topics_label)}</span>
        </div>

        <ol className="m-0 mt-6 flex list-none flex-col gap-0 p-0">
          {k.topics.map((key, i) => (
            <li
              key={key}
              className="grid grid-cols-[40px_1fr] items-baseline gap-4 py-5"
              style={{ borderTop: i === 0 ? "0" : "1px solid var(--rule)" }}
            >
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: "var(--ikat)" }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p className="m-0 text-[15.5px] leading-[1.6]" style={{ color: "var(--ink-2)" }}>
                {t(key)}
              </p>
            </li>
          ))}
        </ol>

        <div className="lp-panel mt-12 flex flex-wrap items-center justify-between gap-5 p-7">
          <p className="m-0 max-w-[520px] text-[15.5px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
            {t(k.contact_note)}
          </p>
          <div className="flex gap-2.5">
            <a href={TELEGRAM_URL} target="_blank" rel="noopener noreferrer" className="btn-ghost" style={{ minHeight: 40 }}>
              <Icon.telegram size={15} color="var(--ikat)" /> Telegram
            </a>
            <Link href="/contact" className="btn-ghost" style={{ minHeight: 40 }}>
              {t("landing.nav.contact")}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
