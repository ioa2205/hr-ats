import Link from "next/link";
import type { TranslationKey } from "@/lib/i18n/types";
import { getT } from "@/lib/i18n/server";
import { ArrowIcon } from "../icons";
import { SIGNUP_HREF } from "../shared";

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
    <main
      className="paper-grain relative"
      style={{ background: "var(--paper)", padding: "64px 28px 120px" }}
    >
      <div className="mx-auto" style={{ maxWidth: 880 }}>
        <Link
          href="/"
          className="mono mb-10 inline-flex items-center gap-2 text-[11px] tracking-[0.14em]"
          style={{ color: "var(--ink-3)" }}
        >
          <span aria-hidden style={{ color: "var(--persimmon-2)" }}>
            ←
          </span>
          {backLabel}
        </Link>
        <div
          className="mono mb-4 text-[11px] tracking-[0.22em]"
          style={{ color: "var(--persimmon-2)" }}
        >
          {t(kickerKey)}
        </div>
        <h1
          className="serif"
          style={{
            margin: "0 0 24px",
            fontSize: "clamp(44px, 6vw + 16px, 92px)",
            lineHeight: 0.96,
            letterSpacing: "-0.035em",
          }}
        >
          {t(headlineKey)}
        </h1>
        <p
          className="serif max-w-[640px] text-[clamp(17px,1.2vw+10px,22px)] italic leading-[1.55]"
          style={{ color: "var(--ink-3)", margin: "0 0 56px" }}
        >
          {t(ledeKey)}
        </p>
        <div className="flex flex-col gap-10">
          {sections.map((sec) => (
            <section key={sec.titleKey}>
              <h2
                className="serif m-0 text-[28px] leading-[1.15] tracking-[-0.02em]"
              >
                {t(sec.titleKey)}
              </h2>
              <p
                className="mt-3 whitespace-pre-line text-[16px] leading-[1.65]"
                style={{ color: "var(--ink-2)" }}
              >
                {t(sec.bodyKey)}
              </p>
            </section>
          ))}
        </div>
        {callToActionKey && (
          <div
            className="mt-14 flex items-center gap-4 border-t pt-8"
            style={{ borderColor: "var(--ink)" }}
          >
            <Link
              href={`${SIGNUP_HREF}?utm_source=landing&utm_section=sub_${kickerKey}`}
              className="btn-primary"
            >
              {t(callToActionKey)}
              <ArrowIcon size={14} color="var(--paper-3)" />
            </Link>
            <Link
              href="/contact"
              className="btn-ghost"
            >
              {t("landing.nav.contact")}
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
