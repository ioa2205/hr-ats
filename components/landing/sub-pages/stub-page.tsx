import Link from "next/link";
import type { TranslationKey } from "@/lib/i18n/types";
import { getT } from "@/lib/i18n/server";
import { ArrowIcon } from "../icons";
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
    <main className="relative" style={{ background: "var(--paper)", padding: "48px 24px clamp(80px, 9vw, 120px)" }}>
      <div className="mx-auto" style={{ maxWidth: 760 }}>
        <Link href="/" className="lp-link mb-10 inline-flex" style={{ color: "var(--ink-3)" }}>
          <span aria-hidden style={{ color: "var(--ikat)" }}>←</span>
          {backLabel}
        </Link>
        <div className="lp-eyebrow is-accent mb-5">{t(kickerKey)}</div>
        <h1 className="lp-display" style={{ margin: "0 0 24px", fontSize: "clamp(40px, 5vw + 12px, 64px)" }}>
          {t(headlineKey)}
        </h1>
        <p className="lp-lede" style={{ margin: "0 0 56px" }}>
          {t(ledeKey)}
        </p>
        <div className="flex flex-col gap-10">
          {sections.map((sec) => (
            <section key={sec.titleKey}>
              <h2 className="lp-h3 m-0">{t(sec.titleKey)}</h2>
              <p className="mt-3 whitespace-pre-line text-[16px] leading-[1.65]" style={{ color: "var(--ink-2)" }}>
                {t(sec.bodyKey)}
              </p>
            </section>
          ))}
        </div>
        {callToActionKey && (
          <div className="mt-14 flex flex-wrap items-center gap-4 border-t pt-8" style={{ borderColor: "var(--rule)" }}>
            <Link href={`${SIGNUP_HREF}?utm_source=landing&utm_section=sub_${kickerKey}`} className="btn-primary">
              {t(callToActionKey)}
              <ArrowIcon size={16} color="var(--color-on-primary)" />
            </Link>
            <Link href="/contact" className="btn-ghost">
              {t("landing.nav.contact")}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
