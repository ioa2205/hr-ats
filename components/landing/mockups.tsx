"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/provider";
import {
  CANDIDATES,
  AI_GAP_KEYS,
  AI_LANGS,
  AI_SCORE,
  AI_STRENGTH_KEYS,
  type Candidate,
} from "./data";

interface IconProps {
  size?: number;
  color?: string;
}

export const Icon = {
  arrow: ({ size = 14, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M2 8h12M10 3l5 5-5 5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  check: ({ size = 14, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8.5 L6.5 12 L13 4.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  flag: ({ size = 14, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M4 2v12M4 3h7l-1.4 2.2L11 7.5H4"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  telegram: ({ size = 18, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden>
      <path d="M20.7 4.3 3.4 11c-1.2.5-1.2 1.2-.2 1.5l4.4 1.4 10.2-6.4c.5-.3.9-.1.5.2l-8.3 7.5-.3 4.5c.5 0 .7-.2 1-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.5c.3-1.3-.4-1.8-1.3-1.5Z" />
    </svg>
  ),
};

interface ScoreRingProps {
  value?: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  animate?: boolean;
  delay?: number;
}

export function ScoreRing({
  value = 94,
  size = 72,
  stroke = 5,
  color = "var(--ikat)",
  trackColor = "var(--paper-strong)",
  animate = true,
  delay = 0,
}: ScoreRingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const [draw, setDraw] = useState<number>(animate ? c : offset);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setDraw(offset), 80 + delay);
    return () => clearTimeout(t);
  }, [value, offset, animate, delay]);

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={draw}
          style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div
        className="mono"
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
          fontSize: size * 0.3,
          color: "var(--ink)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function toneColor(tone: Candidate["tone"]): string {
  switch (tone) {
    case "top":
    case "good":
      return "var(--ikat)";
    case "ok":
      return "var(--rule-strong)";
    default:
      return "var(--rule-strong)";
  }
}

function WindowChrome({ live }: { live: string }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3"
      style={{ borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}
    >
      <span style={{ display: "inline-flex", gap: 6 }} aria-hidden>
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--rule-strong)", opacity: 0.5 }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--rule-strong)", opacity: 0.5 }} />
        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--rule-strong)", opacity: 0.5 }} />
      </span>
      <span
        className="mono truncate"
        style={{ fontSize: 11, letterSpacing: "0.04em", color: "var(--ink-4)" }}
      >
        app.tezhr.uz/jobs/des-042
      </span>
      <span
        className="mono ml-auto inline-flex items-center gap-1.5"
        style={{ fontSize: 10, letterSpacing: "0.12em", color: "var(--ikat)" }}
      >
        <span
          className="lp-live-dot inline-block"
          style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ikat)" }}
        />
        {live}
      </span>
    </div>
  );
}

function CandidateRow({ c, idx, top }: { c: Candidate; idx: number; top: boolean }) {
  const { t } = useTranslation();
  const tone = toneColor(c.tone);
  const exp = t(c.expKey);
  const [expCity] = exp.split(" · ");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "26px minmax(0,1fr) 124px",
        gap: 14,
        alignItems: "center",
        padding: "14px 22px",
        borderBottom: idx === 5 ? "none" : "1px solid var(--rule)",
        background: top ? "var(--ikat-tint)" : "transparent",
        position: "relative",
        opacity: c.tone === "low" ? 0.62 : 1,
      }}
    >
      {top && (
        <span
          aria-hidden
          style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2, background: "var(--ikat)" }}
        />
      )}
      <span className="mono" style={{ fontSize: 13, color: top ? "var(--ikat)" : "var(--ink-4)", fontWeight: 600 }}>
        {idx + 1}
      </span>

      <div style={{ minWidth: 0 }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>
            {c.name}
          </span>
          {top && (
            <span
              className="mono"
              style={{
                fontSize: 9,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "2px 6px",
                borderRadius: 999,
                background: "var(--ikat)",
                color: "var(--color-on-primary)",
              }}
            >
              {t("landing.ranking.top_pick")}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "var(--ink-3)",
            marginTop: 2,
            lineHeight: 1.4,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {expCity} · {c.tags.slice(0, 2).join(" · ")}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <div style={{ flex: 1, height: 6, borderRadius: 999, background: "var(--paper-strong)", overflow: "hidden" }} aria-hidden>
          <div style={{ height: "100%", width: `${c.score}%`, background: tone, borderRadius: 999 }} />
        </div>
        <span className="mono" style={{ fontSize: 13, fontWeight: 700, width: 22, textAlign: "right", color: "var(--ink)" }}>
          {c.score}
        </span>
      </div>
    </div>
  );
}

export function RankingMockup() {
  const { t } = useTranslation();
  return (
    <div
      className="lp-panel"
      style={{
        width: "100%",
        maxWidth: 640,
        overflow: "hidden",
        fontFamily: "var(--font-manrope), sans-serif",
        color: "var(--ink)",
        boxShadow: "var(--shadow-level-2)",
      }}
    >
      <WindowChrome live={t("landing.ranking.live")} />

      {/* Job header */}
      <div style={{ padding: "20px 22px 16px", borderBottom: "1px solid var(--rule)" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-4)", marginBottom: 6 }}>
          {t("landing.ranking.job_kicker")}
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h3 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
            {t("landing.ranking.job_title_prefix")} {t("landing.ranking.job_title_role")}
          </h3>
          <div className="flex items-stretch gap-2.5">
            <Stat v="247" l={t("landing.ranking.stat_applications")} />
            <Stat v="94" l={t("landing.ranking.stat_top_score")} accent />
            <Stat v="30s" l={t("landing.ranking.stat_time")} />
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div
        className="flex flex-wrap items-center gap-2 px-[22px] py-3"
        style={{ borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}
      >
        <span
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.06em",
            padding: "4px 10px",
            borderRadius: 999,
            background: "var(--ikat)",
            color: "var(--color-on-primary)",
          }}
        >
          {t("landing.ranking.chip_sort")}
        </span>
        <span className="lp-chip">{t("landing.ranking.chip_experience")}</span>
        <span className="lp-chip">{t("landing.ranking.chip_languages")}</span>
        <span className="mono ml-auto" style={{ fontSize: 10, color: "var(--ink-4)" }}>
          {t("landing.ranking.showing")}
        </span>
      </div>

      <div>
        {CANDIDATES.slice(0, 6).map((c, i) => (
          <CandidateRow key={c.name} c={c} idx={i} top={i === 0} />
        ))}
      </div>
    </div>
  );
}

function Stat({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: "right", paddingLeft: 14, borderLeft: "1px solid var(--rule)" }}>
      <div
        className="mono"
        style={{ fontSize: 22, lineHeight: 1, fontWeight: 700, letterSpacing: "-0.02em", color: accent ? "var(--ikat)" : "var(--ink)" }}
      >
        {v}
      </div>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-4)", marginTop: 4 }}>
        {l}
      </div>
    </div>
  );
}

export function AIPanel() {
  const { t } = useTranslation();
  const candidate = CANDIDATES[0];
  return (
    <div
      className="lp-panel"
      style={{
        width: "100%",
        maxWidth: 480,
        overflow: "hidden",
        fontFamily: "var(--font-manrope), sans-serif",
        color: "var(--ink)",
        boxShadow: "var(--shadow-level-2)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-[22px] py-4"
        style={{ borderBottom: "1px solid var(--rule)" }}
      >
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ikat)" }}>
            {t("landing.ai.kicker")}
          </div>
          <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: "-0.015em", marginTop: 3 }}>
            {candidate.name}
          </div>
        </div>
        <div className="mono" style={{ fontSize: 10, color: "var(--ink-4)", textAlign: "right", letterSpacing: "0.04em", lineHeight: 1.5 }}>
          3.8s
          <br />
          14·05·26
        </div>
      </div>

      {/* Score block */}
      <div className="flex items-center gap-5 px-[22px] py-5" style={{ borderBottom: "1px solid var(--rule)" }}>
        <ScoreRing value={AI_SCORE} size={86} stroke={7} />
        <div style={{ minWidth: 0 }}>
          <div
            className="mono"
            style={{
              display: "inline-block",
              fontSize: 9,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              padding: "3px 8px",
              borderRadius: 999,
              background: "var(--ikat-tint)",
              color: "var(--ikat-on-tint)",
              marginBottom: 8,
            }}
          >
            {t("landing.ai.match")} · {t("landing.ai.verdict")}
          </div>
          <p style={{ margin: 0, fontSize: 14.5, lineHeight: 1.45, color: "var(--ink-2)" }}>
            {t("landing.ai.pull_quote")}
          </p>
        </div>
      </div>

      {/* Strengths / gaps */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ padding: "16px 20px", borderRight: "1px solid var(--rule)" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--leaf)", marginBottom: 12 }}>
            {t("landing.ai.strengths")}
          </div>
          {AI_STRENGTH_KEYS.map((k) => (
            <div key={k} style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 12.5, lineHeight: 1.4, color: "var(--ink-2)" }}>
              <Icon.check size={13} color="var(--leaf)" />
              <span>{t(k)}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "16px 20px" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--saffron)", marginBottom: 12 }}>
            {t("landing.ai.gaps")}
          </div>
          {AI_GAP_KEYS.map((k) => (
            <div key={k} style={{ display: "flex", gap: 8, marginBottom: 10, fontSize: 12.5, lineHeight: 1.4, color: "var(--ink-2)" }}>
              <Icon.flag size={13} color="var(--saffron)" />
              <span>{t(k)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Languages */}
      <div className="flex gap-3 px-[22px] py-4" style={{ borderTop: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        {AI_LANGS.map((l) => (
          <div key={l.code} style={{ flex: 1 }} aria-hidden>
            <div className="mono flex justify-between" style={{ fontSize: 10, marginBottom: 4, letterSpacing: "0.06em", color: "var(--ink-3)" }}>
              <span>{l.code}</span>
              <span style={{ color: "var(--ink-4)" }}>{l.pct}%</span>
            </div>
            <div style={{ height: 4, borderRadius: 999, background: "var(--paper-strong)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${l.pct}%`, background: "var(--ikat)", borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Advisory footer + human actions (kept visually separate from AI output) */}
      <div className="flex items-center gap-3 px-[22px] py-3.5" style={{ borderTop: "1px solid var(--rule)" }}>
        <span className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", color: "var(--ink-4)", flex: 1, lineHeight: 1.4 }}>
          {t("landing.ai.recommend_invite")}
        </span>
        <span
          style={{
            padding: "8px 14px",
            borderRadius: "var(--radius-md)",
            background: "var(--ikat)",
            color: "var(--color-on-primary)",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {t("landing.ai.interview_cta")}
        </span>
      </div>
    </div>
  );
}
