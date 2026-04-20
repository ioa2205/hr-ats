import { getT } from "@/lib/i18n/server";
import type { TranslationKey } from "@/lib/i18n/types";

interface Frame {
  kicker: TranslationKey;
  title: TranslationKey;
  note: TranslationKey;
  visual: React.ReactNode;
}

function FrameJob() {
  return (
    <div
      className="mono text-[10px]"
      style={{ background: "var(--ink)", color: "var(--paper-3)", padding: 12 }}
    >
      <div style={{ opacity: 0.72 }}>&gt; tezhr post</div>
      <div className="serif mt-2 text-[18px] italic">Senior Product Designer</div>
      <div style={{ marginTop: 6, opacity: 0.72 }}>tags: Figma · B2B · RU+EN</div>
      <div style={{ marginTop: 8, color: "var(--persimmon)" }}>✓ published → /j/des-042</div>
    </div>
  );
}

function FrameQueue() {
  return (
    <div
      className="mono text-[10px]"
      style={{ background: "var(--paper-3)", padding: 12, border: "1px solid var(--ink)" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="pulse-dot inline-block"
          style={{ width: 6, height: 6, background: "var(--persimmon)", borderRadius: "50%" }}
        />
        <span style={{ color: "var(--ink-3)" }}>INGEST · 247 / 247</span>
      </div>
      <div style={{ marginTop: 10 }}>
        {[
          { k: "diyora_r.pdf", s: "ok" },
          { k: "aziz_k.pdf", s: "ok" },
          { k: "madina_y.pdf", s: "ok" },
          { k: "... +244", s: "queue" },
        ].map((r) => (
          <div
            key={r.k}
            className="flex items-center gap-2"
            style={{ padding: "2px 0" }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                background: r.s === "ok" ? "var(--ikat)" : "var(--ink-4)",
              }}
            />
            <span style={{ color: "var(--ink-2)" }}>{r.k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FrameRead() {
  return (
    <div
      className="mono text-[10px]"
      style={{ background: "var(--paper-3)", padding: 12, border: "1px solid var(--ink)" }}
    >
      <div style={{ color: "var(--persimmon-2)", letterSpacing: "0.14em" }}>AI · tz-rec-2.4</div>
      <div
        className="serif mt-2 text-[16px] italic leading-snug"
        style={{ color: "var(--ink-2)" }}
      >
        «Сильный в B2B SaaS, разбирается в design systems, знает Figma — идеальное совпадение с вакансией.»
      </div>
      <div className="mt-3 flex gap-2">
        <span style={{ padding: "2px 6px", background: "var(--ikat)", color: "var(--paper-3)" }}>
          strength: 04
        </span>
        <span style={{ padding: "2px 6px", background: "var(--persimmon)", color: "var(--paper-3)" }}>
          gap: 02
        </span>
      </div>
    </div>
  );
}

function FrameRanked() {
  const rows = [
    { n: "Диёра Р.", s: 94, tone: "var(--persimmon)" },
    { n: "Азиз К.", s: 87, tone: "var(--ikat)" },
    { n: "Мадина Ю.", s: 82, tone: "var(--ikat)" },
  ];
  return (
    <div
      style={{ background: "var(--paper-3)", padding: 12, border: "1px solid var(--ink)" }}
    >
      <div
        className="mono"
        style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.14em", marginBottom: 8 }}
      >
        RANKED · top 3
      </div>
      {rows.map((r, i) => (
        <div
          key={r.n}
          className="flex items-center gap-2"
          style={{ padding: "4px 0" }}
        >
          <span
            className="serif"
            style={{ color: "var(--ink-3)", fontSize: 13, width: 14 }}
          >
            {i + 1}
          </span>
          <span className="serif flex-1 text-[13px]">{r.n}</span>
          <div
            className="flex-[1.3]"
            style={{ height: 4, background: "var(--paper-2)", border: "1px solid var(--ink)" }}
          >
            <div style={{ height: "100%", width: `${r.s}%`, background: r.tone }} />
          </div>
          <span
            className="mono"
            style={{ fontSize: 11, fontWeight: 600, width: 22, textAlign: "right" }}
          >
            {r.s}
          </span>
        </div>
      ))}
    </div>
  );
}

function FrameInvite() {
  return (
    <div
      className="mono text-[10px]"
      style={{
        background: "var(--ink)",
        color: "var(--paper-3)",
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <div style={{ color: "var(--saffron)", letterSpacing: "0.14em" }}>ACTION</div>
      <div className="serif text-[16px] italic">Пригласить Диёру Р. на интервью</div>
      <div style={{ opacity: 0.72 }}>via Telegram · via Email</div>
      <div
        style={{
          marginTop: 8,
          background: "var(--persimmon)",
          color: "var(--paper-3)",
          padding: "5px 10px",
          textAlign: "center",
          letterSpacing: "0.08em",
        }}
      >
        → invitation sent
      </div>
    </div>
  );
}

const FRAMES: Frame[] = [
  {
    kicker: "landing.how.wt_frame_1_kicker",
    title: "landing.how.wt_frame_1_title",
    note: "landing.how.wt_frame_1_note",
    visual: <FrameJob />,
  },
  {
    kicker: "landing.how.wt_frame_2_kicker",
    title: "landing.how.wt_frame_2_title",
    note: "landing.how.wt_frame_2_note",
    visual: <FrameQueue />,
  },
  {
    kicker: "landing.how.wt_frame_3_kicker",
    title: "landing.how.wt_frame_3_title",
    note: "landing.how.wt_frame_3_note",
    visual: <FrameRead />,
  },
  {
    kicker: "landing.how.wt_frame_4_kicker",
    title: "landing.how.wt_frame_4_title",
    note: "landing.how.wt_frame_4_note",
    visual: <FrameRanked />,
  },
  {
    kicker: "landing.how.wt_frame_5_kicker",
    title: "landing.how.wt_frame_5_title",
    note: "landing.how.wt_frame_5_note",
    visual: <FrameInvite />,
  },
];

export async function Walkthrough() {
  const { t } = await getT();
  return (
    <div className="mt-14">
      <div
        className="mb-5 flex flex-wrap items-end gap-4 border-t pt-6"
        style={{ borderColor: "var(--ink)" }}
      >
        <span
          className="mono text-[11px] tracking-[0.2em]"
          style={{ color: "var(--persimmon-2)" }}
        >
          {t("landing.how.wt_tag")}
        </span>
        <span
          className="serif text-[18px] italic"
          style={{ color: "var(--ink-3)" }}
        >
          {t("landing.how.wt_title")}
        </span>
        <span
          className="mono ml-auto text-[11px] tracking-[0.18em]"
          style={{ color: "var(--ink-3)" }}
        >
          {t("landing.how.wt_meta")}
        </span>
      </div>

      <ol
        className="grid gap-4 p-0 md:grid-cols-5"
        style={{ listStyle: "none" }}
      >
        {FRAMES.map((f, i) => (
          <li
            key={f.title}
            className="flex flex-col gap-3 border p-4"
            style={{
              borderColor: "var(--ink)",
              background: "var(--paper-3)",
            }}
          >
            <div className="flex items-baseline justify-between">
              <span
                className="serif text-[22px] italic leading-none"
                style={{ color: "var(--persimmon-2)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className="mono text-[9px] tracking-[0.16em]"
                style={{ color: "var(--ink-3)" }}
              >
                {t(f.kicker)}
              </span>
            </div>
            <div
              className="serif text-[17px] leading-[1.15] tracking-[-0.015em]"
            >
              {t(f.title)}
            </div>
            <div>{f.visual}</div>
            <div
              className="text-[12px] leading-[1.45]"
              style={{ color: "var(--ink-3)" }}
            >
              {t(f.note)}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
