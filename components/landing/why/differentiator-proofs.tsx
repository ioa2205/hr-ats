import { getT } from "@/lib/i18n/server";
import { CheckIcon } from "../icons";

export async function MultilingualProof() {
  const { t } = await getT();
  const rows = [
    { lang: "RU", score: 94, text: t("landing.why.card_1_sample_ru") },
    { lang: "O'Z", score: 94, text: t("landing.why.card_1_sample_uz") },
    { lang: "EN", score: 94, text: t("landing.why.card_1_sample_en") },
  ];
  return (
    <div className="rounded-lg border text-[12px]" style={{ borderColor: "var(--rule)", background: "var(--paper-2)", overflow: "hidden" }}>
      {rows.map((r, i) => (
        <div
          key={r.lang}
          className="flex items-center gap-3 px-3 py-2"
          style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--rule)" : "none" }}
        >
          <span className="mono" style={{ display: "inline-block", width: 30, fontSize: 10, letterSpacing: "0.08em", color: "var(--ink-4)" }}>
            {r.lang}
          </span>
          <span className="flex-1 truncate" style={{ color: "var(--ink-2)" }}>
            {r.text}
          </span>
          <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: "var(--ikat)" }}>
            {r.score}
          </span>
        </div>
      ))}
    </div>
  );
}

export function LocalMarketProof() {
  const chips = [
    "1С Предприятие",
    "Главбух",
    "МСФО",
    "НДС 12%",
    "СЭЗ Навои",
    "UzCard",
    "Humo",
    "Uzum",
    "Ucell",
    "Beeline UZ",
    "Click",
    "Payme",
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span key={c} className="lp-chip" style={{ fontSize: 10, padding: "3px 8px" }}>
          {c}
        </span>
      ))}
    </div>
  );
}

export async function SecurityProof() {
  const { t } = await getT();
  const items = [
    t("landing.why.card_3_point_1"),
    t("landing.why.card_3_point_2"),
    t("landing.why.card_3_point_3"),
  ];
  return (
    <ul className="m-0 list-none p-0">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2 text-[12.5px] leading-[1.45]" style={{ padding: "4px 0", color: "var(--ink-2)" }}>
          <span className="mt-0.5 shrink-0">
            <CheckIcon size={13} color="var(--leaf)" />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
