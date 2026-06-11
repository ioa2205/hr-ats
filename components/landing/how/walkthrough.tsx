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
    <div className="rounded-lg p-3 text-[10px]" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
      <div className="mono" style={{ color: "var(--ink-4)", letterSpacing: "0.08em" }}>POST · DES-042</div>
      <div className="mt-1.5 text-[14px] font-bold tracking-[-0.01em]" style={{ color: "var(--ink)" }}>
        Senior Product Designer
      </div>
      <div className="mono mt-1.5" style={{ color: "var(--ink-4)" }}>Figma · B2B · RU+EN</div>
      <div className="mono mt-2 inline-flex items-center gap-1" style={{ color: "var(--ikat)" }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--leaf)" }} aria-hidden /> published
      </div>
    </div>
  );
}

function FrameQueue() {
  return (
    <div className="rounded-lg p-3 text-[10px]" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
      <div className="mono flex items-center gap-1.5" style={{ color: "var(--ink-4)", letterSpacing: "0.06em" }}>
        <span className="lp-live-dot inline-block" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ikat)" }} aria-hidden />
        SCREENING · 247 / 247
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {["diyora_r.pdf", "aziz_k.pdf", "madina_y.pdf", "+ 244"].map((k, i) => (
          <div key={k} className="flex items-center gap-1.5 mono" style={{ color: "var(--ink-2)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: i < 3 ? "var(--leaf)" : "var(--rule-strong)" }} aria-hidden />
            {k}
          </div>
        ))}
      </div>
    </div>
  );
}

function FrameRead() {
  return (
    <div className="rounded-lg p-3 text-[10px]" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
      <div className="mono" style={{ color: "var(--ikat)", letterSpacing: "0.1em" }}>AI ASSESSMENT</div>
      <div className="mt-1.5 text-[12px] leading-snug" style={{ color: "var(--ink-2)" }}>
        Strong B2B SaaS background, fluent in design systems and Figma — close match to the role.
      </div>
      <div className="mt-2.5 flex gap-1.5">
        <span className="mono rounded-md px-1.5 py-0.5" style={{ background: "var(--color-success-container)", color: "var(--leaf)" }}>
          4 strengths
        </span>
        <span className="mono rounded-md px-1.5 py-0.5" style={{ background: "var(--color-warning-container)", color: "var(--saffron)" }}>
          2 gaps
        </span>
      </div>
    </div>
  );
}

function FrameRanked() {
  const rows = [
    { n: "Диёра Р.", s: 94, top: true },
    { n: "Азиз К.", s: 87, top: false },
    { n: "Мадина Ю.", s: 82, top: false },
  ];
  return (
    <div className="rounded-lg p-3" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
      <div className="mono mb-2" style={{ fontSize: 10, color: "var(--ink-4)", letterSpacing: "0.1em" }}>RANKED · top 3</div>
      {rows.map((r, i) => (
        <div key={r.n} className="flex items-center gap-1.5" style={{ padding: "4px 0" }}>
          <span className="mono" style={{ color: "var(--ink-4)", fontSize: 10, width: 12 }}>{i + 1}</span>
          <span className="flex-1 text-[11px] font-semibold">{r.n}</span>
          <div className="flex-[1.2]" style={{ height: 5, borderRadius: 999, background: "var(--paper-strong)", overflow: "hidden" }} aria-hidden>
            <div style={{ height: "100%", width: `${r.s}%`, background: r.top ? "var(--ikat)" : "var(--rule-strong)", borderRadius: 999 }} />
          </div>
          <span className="mono" style={{ fontSize: 11, fontWeight: 700, width: 20, textAlign: "right" }}>{r.s}</span>
        </div>
      ))}
    </div>
  );
}

function FrameInvite() {
  return (
    <div className="rounded-lg p-3 text-[10px]" style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}>
      <div className="mono" style={{ color: "var(--ink-4)", letterSpacing: "0.1em" }}>ACTION · RECRUITER</div>
      <div className="mt-1.5 text-[12px] font-semibold" style={{ color: "var(--ink)" }}>
        Invite Diyora to interview
      </div>
      <div className="mono mt-1.5" style={{ color: "var(--ink-4)" }}>via Telegram · Email</div>
      <div
        className="mono mt-2 rounded-md px-2 py-1.5 text-center"
        style={{ background: "var(--ikat)", color: "var(--color-on-primary)", letterSpacing: "0.04em" }}
      >
        invitation sent
      </div>
    </div>
  );
}

const FRAMES: Frame[] = [
  { kicker: "landing.how.wt_frame_1_kicker", title: "landing.how.wt_frame_1_title", note: "landing.how.wt_frame_1_note", visual: <FrameJob /> },
  { kicker: "landing.how.wt_frame_2_kicker", title: "landing.how.wt_frame_2_title", note: "landing.how.wt_frame_2_note", visual: <FrameQueue /> },
  { kicker: "landing.how.wt_frame_3_kicker", title: "landing.how.wt_frame_3_title", note: "landing.how.wt_frame_3_note", visual: <FrameRead /> },
  { kicker: "landing.how.wt_frame_4_kicker", title: "landing.how.wt_frame_4_title", note: "landing.how.wt_frame_4_note", visual: <FrameRanked /> },
  { kicker: "landing.how.wt_frame_5_kicker", title: "landing.how.wt_frame_5_title", note: "landing.how.wt_frame_5_note", visual: <FrameInvite /> },
];

export async function Walkthrough() {
  const { t } = await getT();
  return (
    <div className="mt-16">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-t pt-7" style={{ borderColor: "var(--rule)" }}>
        <span className="lp-eyebrow">{t("landing.how.wt_title")}</span>
        <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--ink-4)" }}>
          {t("landing.how.wt_meta")}
        </span>
      </div>

      <ol className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-5">
        {FRAMES.map((f, i) => (
          <li key={f.title} className="lp-panel flex flex-col gap-3" style={{ padding: 16 }}>
            <div className="flex items-center justify-between">
              <span
                className="mono grid h-7 w-7 place-items-center rounded-md text-[12px]"
                style={{ background: "var(--ikat-tint)", color: "var(--ikat-on-tint)", fontWeight: 700 }}
              >
                {i + 1}
              </span>
              <span className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)" }}>
                {t(f.kicker)}
              </span>
            </div>
            <div className="text-[15px] font-bold leading-[1.15] tracking-[-0.01em]">{t(f.title)}</div>
            <div>{f.visual}</div>
            <div className="text-[12px] leading-[1.45]" style={{ color: "var(--ink-3)" }}>
              {t(f.note)}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
