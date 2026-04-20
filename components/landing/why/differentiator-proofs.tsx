import { getT } from "@/lib/i18n/server";

export async function MultilingualProof() {
  const { t } = await getT();
  const rows = [
    { lang: "RU", score: 94, text: t("landing.why.card_1_sample_ru") },
    { lang: "O'Z", score: 94, text: t("landing.why.card_1_sample_uz") },
    { lang: "EN", score: 94, text: t("landing.why.card_1_sample_en") },
  ];
  return (
    <div
      className="border text-[12px]"
      style={{
        borderColor: "var(--ink)",
        background: "var(--paper-3)",
      }}
    >
      {rows.map((r, i) => (
        <div
          key={r.lang}
          className="flex items-center gap-3 px-3 py-2"
          style={{
            borderBottom: i < rows.length - 1 ? "1px dashed var(--ink-4)" : "none",
          }}
        >
          <span
            className="mono text-[10px] tracking-[0.12em]"
            style={{
              display: "inline-block",
              width: 32,
              color: "var(--ink-3)",
            }}
          >
            {r.lang}
          </span>
          <span className="serif flex-1 truncate italic" style={{ color: "var(--ink-2)" }}>
            &ldquo;{r.text}&rdquo;
          </span>
          <span
            className="mono text-[11px] font-semibold"
            style={{ color: "var(--persimmon-2)" }}
          >
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
    "Humans",
    "Ucell",
    "Uzum",
    "Beeline UZ",
    "Oson",
  ];
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((c) => (
        <span
          key={c}
          className="mono text-[10px] tracking-[0.04em]"
          style={{
            padding: "2px 8px",
            background: "var(--paper-3)",
            border: "1px solid var(--ink-4)",
          }}
        >
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
        <li
          key={item}
          className="flex items-start gap-2 text-[12px] leading-[1.45]"
          style={{ padding: "4px 0", color: "var(--ink-2)" }}
        >
          <span
            className="serif mt-0.5 text-[14px]"
            style={{ color: "var(--ikat)" }}
          >
            ✓
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
