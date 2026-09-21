import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { TranslationKey } from "@/lib/i18n/types";
import { getT } from "@/lib/i18n/server";
import { SIGNUP_HREF } from "../constants";

interface StubSection {
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
}
export interface StubPageProps {
  kickerKey: TranslationKey;
  headlineKey: TranslationKey;
  ledeKey: TranslationKey;
  sections: StubSection[];
  backLabel: string;
  callToActionKey?: TranslationKey;
}

export async function StubPage({
  kickerKey,
  headlineKey,
  ledeKey,
  sections,
  backLabel,
  callToActionKey,
}: StubPageProps) {
  const { t } = await getT();
  return (
    <main id="main">
      <section className="craft-page-hero craft-page-hero-compact craft-paper-blue">
        <div className="craft-container">
          <Link href="/" className="craft-back-link">
            {backLabel}
          </Link>
          <p className="craft-kicker">{t(kickerKey)}</p>
          <h1 className="craft-display craft-display-medium">{t(headlineKey)}</h1>
          <p className="craft-lede">{t(ledeKey)}</p>
        </div>
        <Image
          className="craft-subpage-skyline"
          src="/marketing/tashkent-skyline.png"
          alt=""
          width={2172}
          height={724}
          priority
          sizes="(min-width: 800px) 48vw, 100vw"
        />
      </section>
      <section className="craft-page-body craft-paper">
        <div className="craft-container">
          <ol className="craft-numbered-list">
            {sections.map((section, index) => (
              <li key={section.titleKey}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{t(section.titleKey)}</h2>
                  <p>{t(section.bodyKey)}</p>
                </div>
              </li>
            ))}
          </ol>
          {callToActionKey && (
            <div className="craft-subpage-actions">
              <Link
                href={`${SIGNUP_HREF}?utm_source=landing&utm_section=${encodeURIComponent(kickerKey)}`}
                className="craft-button craft-button-sage"
              >
                {t(callToActionKey)}
                <ArrowRight aria-hidden size={17} />
              </Link>
              <Link href="/contact" className="craft-text-link">
                {t("landing.nav.contact")} ↗
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
