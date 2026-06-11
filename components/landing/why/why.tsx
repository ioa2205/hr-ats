import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { ArrowIcon } from "../icons";
import type { TranslationKey } from "@/lib/i18n/types";
import { SectionHeader } from "../section";
import { MultilingualProof, LocalMarketProof, SecurityProof } from "./differentiator-proofs";

interface Card {
  id: string;
  href: string;
  kickerKey: TranslationKey;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  proofLabelKey: TranslationKey;
  readMoreKey: TranslationKey;
  proof: React.ReactNode;
}

const CARDS: Card[] = [
  {
    id: "multilingual",
    href: "/product/multilingual",
    kickerKey: "landing.why.card_1_kicker",
    titleKey: "landing.why.card_1_title",
    bodyKey: "landing.why.card_1_body",
    proofLabelKey: "landing.why.card_1_proof_label",
    readMoreKey: "landing.why.read_more",
    proof: <MultilingualProof />,
  },
  {
    id: "local-market",
    href: "/product/local-market",
    kickerKey: "landing.why.card_2_kicker",
    titleKey: "landing.why.card_2_title",
    bodyKey: "landing.why.card_2_body",
    proofLabelKey: "landing.why.card_2_proof_label",
    readMoreKey: "landing.why.read_more",
    proof: <LocalMarketProof />,
  },
  {
    id: "security",
    href: "/security",
    kickerKey: "landing.why.card_3_kicker",
    titleKey: "landing.why.card_3_title",
    bodyKey: "landing.why.card_3_body",
    proofLabelKey: "landing.why.card_3_proof_label",
    readMoreKey: "landing.why.read_more",
    proof: <SecurityProof />,
  },
];

export async function Why() {
  const { t } = await getT();
  return (
    <section id="product" className="relative" style={{ background: "var(--paper)", padding: "clamp(72px, 8vw, 104px) 24px" }}>
      <div className="mx-auto lp-reveal" style={{ maxWidth: 1200 }}>
        <SectionHeader eyebrow={t("landing.why.section_tag")} meta={t("landing.why.section_meta")} maxWidth={1000}>
          {t("landing.why.heading")} <span className="lp-accent">{t("landing.why.heading_em")}</span> {t("landing.why.heading_tail")}
        </SectionHeader>

        <ul className="grid list-none gap-5 p-0 md:grid-cols-3">
          {CARDS.map((c, i) => (
            <li
              key={c.id}
              className="lp-panel flex flex-col gap-4"
              style={{ padding: "28px 26px", transition: "box-shadow 160ms, transform 160ms" }}
            >
              <div className="flex items-center justify-between">
                <span
                  className="mono grid h-9 w-9 place-items-center rounded-lg text-[13px]"
                  style={{ background: "var(--ikat-tint)", color: "var(--ikat-on-tint)", fontWeight: 700 }}
                >
                  {`0${i + 1}`}
                </span>
                <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                  {t(c.kickerKey)}
                </span>
              </div>
              <h3 className="lp-h3 m-0">{t(c.titleKey)}</h3>
              <p className="m-0 text-[14.5px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
                {t(c.bodyKey)}
              </p>
              <div className="mt-1 flex flex-col gap-2.5 border-t pt-4" style={{ borderColor: "var(--rule)" }}>
                <span className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                  {t(c.proofLabelKey)}
                </span>
                <div>{c.proof}</div>
              </div>
              <Link href={c.href} className="lp-link mt-auto pt-2">
                {t(c.readMoreKey)}
                <ArrowIcon size={13} color="var(--ikat)" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
