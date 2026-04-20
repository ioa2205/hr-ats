import Link from "next/link";
import { getT } from "@/lib/i18n/server";
import { ArrowIcon } from "../icons";
import type { TranslationKey } from "@/lib/i18n/types";
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
    <section
      id="product"
      className="paper-grain relative"
      style={{ background: "var(--paper)", padding: "96px 28px 88px" }}
    >
      <div className="mx-auto" style={{ maxWidth: 1360 }}>
        <div
          className="mb-6 flex flex-wrap items-end gap-7 border-b pb-3.5"
          style={{ borderColor: "var(--ink)" }}
        >
          <span
            className="mono text-[11px] tracking-[0.2em]"
            style={{ color: "var(--persimmon-2)" }}
          >
            {t("landing.why.section_tag")}
          </span>
          <span
            className="serif text-[20px] italic"
            style={{ color: "var(--ink-3)" }}
          >
            {t("landing.why.section_title")}
          </span>
          <span
            className="mono ml-auto text-[11px] tracking-[0.18em]"
            style={{ color: "var(--ink-3)" }}
          >
            {t("landing.why.section_meta")}
          </span>
        </div>
        <h2
          className="serif max-w-[1000px]"
          style={{
            margin: "0 0 56px",
            fontSize: "clamp(40px, 5vw + 16px, 82px)",
            lineHeight: 0.96,
            letterSpacing: "-0.035em",
          }}
        >
          {t("landing.why.heading")}{" "}
          <em style={{ fontStyle: "italic", color: "var(--persimmon-2)" }}>
            {t("landing.why.heading_em")}
          </em>{" "}
          {t("landing.why.heading_tail")}
        </h2>

        <ul
          className="grid gap-0 p-0 md:grid-cols-3"
          style={{
            listStyle: "none",
            borderTop: "2px solid var(--ink)",
            borderBottom: "2px solid var(--ink)",
          }}
        >
          {CARDS.map((c, i) => (
            <li
              key={c.id}
              className="flex flex-col gap-5"
              style={{
                padding: "32px 28px",
                borderRight: i < CARDS.length - 1 ? "1px solid var(--ink)" : "0",
                borderTop: "0",
                background: "var(--paper)",
              }}
            >
              <div className="flex items-start justify-between">
                <span
                  className="serif text-[54px] leading-none tracking-[-0.035em]"
                  style={{ color: "var(--persimmon-2)" }}
                >
                  {`0${i + 1}`}
                </span>
                <span
                  className="mono text-[10px] tracking-[0.18em]"
                  style={{ color: "var(--ink-3)" }}
                >
                  {t(c.kickerKey)}
                </span>
              </div>
              <h3
                className="serif m-0 text-[28px] leading-[1.06] tracking-[-0.02em]"
              >
                {t(c.titleKey)}
              </h3>
              <p
                className="m-0 max-w-[320px] text-[14px] leading-[1.55]"
                style={{ color: "var(--ink-2)" }}
              >
                {t(c.bodyKey)}
              </p>
              <div
                className="mt-1 flex flex-col gap-2 border-t pt-4"
                style={{ borderColor: "var(--ink-4)" }}
              >
                <span
                  className="mono text-[10px] tracking-[0.14em]"
                  style={{ color: "var(--ink-3)" }}
                >
                  {t(c.proofLabelKey)}
                </span>
                <div>{c.proof}</div>
              </div>
              <Link
                href={c.href}
                className="mt-auto inline-flex items-center gap-2 pt-3 text-[13px] font-medium"
                style={{ color: "var(--ink)" }}
              >
                {t(c.readMoreKey)}
                <ArrowIcon size={12} color="var(--persimmon-2)" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
