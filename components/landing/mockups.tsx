"use client";

import { useEffect, useState, type CSSProperties } from "react";
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
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
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
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8.5 L6.5 12 L13 4.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  star: ({ size = 14, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <path d="M8 1 L10 6 L15 6 L11 9.5 L12.5 15 L8 11.5 L3.5 15 L5 9.5 L1 6 L6 6 Z" />
    </svg>
  ),
  telegram: ({ size = 18, color = "currentColor" }: IconProps) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M20.7 4.3 3.4 11c-1.2.5-1.2 1.2-.2 1.5l4.4 1.4 10.2-6.4c.5-.3.9-.1.5.2l-8.3 7.5-.3 4.5c.5 0 .7-.2 1-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.5c.3-1.3-.4-1.8-1.3-1.5Z" />
    </svg>
  ),
  handArrow: ({
    w = 100,
    color = "#C1440E",
    rotate = 0,
  }: {
    w?: number;
    color?: string;
    rotate?: number;
  }) => (
    <svg
      width={w}
      height="60"
      viewBox="0 0 200 120"
      style={{ transform: `rotate(${rotate}deg)`, overflow: "visible" }}
    >
      <path
        d="M10 20 Q 60 10, 110 50 T 180 95"
        stroke={color}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M180 95 L 168 82 M 180 95 L 166 100"
        stroke={color}
        strokeWidth="2.2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  ),
};

export function Wordmark({ size = 22, color }: { size?: number; color?: string }) {
  const c = color || "var(--ink)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 0,
        fontFamily: "var(--font-instrument-serif), serif",
        fontSize: size,
        color: c,
        letterSpacing: "-0.02em",
        lineHeight: 1,
      }}
    >
      <span>tez</span>
      <span
        style={{
          fontStyle: "italic",
          color: "var(--persimmon)",
          fontSize: size * 0.9,
          margin: "0 1px",
        }}
      >
        ·
      </span>
      <span
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: size * 0.68,
          fontWeight: 700,
          letterSpacing: "0.02em",
          alignSelf: "center",
          marginLeft: 2,
        }}
      >
        HR
      </span>
    </span>
  );
}

interface ScoreRingProps {
  value?: number;
  size?: number;
  stroke?: number;
  color?: string;
  animate?: boolean;
  delay?: number;
}

export function ScoreRing({
  value = 94,
  size = 72,
  stroke = 5,
  color = "var(--persimmon)",
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
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(20,18,16,0.12)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="butt"
          strokeDasharray={c}
          strokeDashoffset={draw}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(.22,.8,.2,1)" }}
        />
      </svg>
      <div
        className="mono"
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontWeight: 600,
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

export function Seal() {
  const text = "TEZHR · TASHKENT · 2026 · AI SCREENING · ";
  return (
    <div style={{ position: "relative", width: 140, height: 140 }}>
      <svg viewBox="0 0 140 140" width={140} height={140} className="spin-seal">
        <defs>
          <path id="tezhr-seal-circ" d="M 70 70 m -54 0 a 54 54 0 1 1 108 0 a 54 54 0 1 1 -108 0" />
        </defs>
        <text
          fontSize="10"
          style={{ fontFamily: "var(--font-jetbrains-mono), monospace" }}
          letterSpacing="3"
          fill="var(--persimmon-2)"
        >
          <textPath href="#tezhr-seal-circ">{text.repeat(2)}</textPath>
        </text>
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          textAlign: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-instrument-serif), serif",
            fontSize: 38,
            color: "var(--persimmon-2)",
            lineHeight: 0.9,
            fontStyle: "italic",
          }}
        >
          tez
        </div>
      </div>
    </div>
  );
}

function BigStat({ v, l, accent, last }: { v: string; l: string; accent?: boolean; last?: boolean }) {
  return (
    <div
      style={{
        padding: "0 16px",
        textAlign: "right",
        borderRight: last ? "none" : "1px solid var(--ink-4)",
      }}
    >
      <div
        className="serif"
        style={{
          fontSize: 32,
          lineHeight: 1,
          color: accent ? "var(--persimmon-2)" : "var(--ink)",
          letterSpacing: "-0.03em",
        }}
      >
        {v}
      </div>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.16em",
          color: "var(--ink-3)",
          marginTop: 4,
        }}
      >
        {l}
      </div>
    </div>
  );
}

function CandidateRow({ c, idx, top }: { c: Candidate; idx: number; top: boolean }) {
  const { t } = useTranslation();
  const ringColor =
    c.tone === "top"
      ? "var(--persimmon)"
      : c.tone === "good"
        ? "var(--ikat)"
        : c.tone === "ok"
          ? "var(--ink-3)"
          : "var(--ink-4)";

  const exp = t(c.expKey);
  const [expCity, expWhere] = exp.split(" · ");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "44px 1fr 90px 160px 1fr 70px",
        gap: 14,
        alignItems: "center",
        padding: "14px 24px",
        borderBottom: idx === CANDIDATES.length - 1 ? "none" : "1px dashed var(--ink-4)",
        background: top ? "var(--paper-2)" : "transparent",
        position: "relative",
        opacity: c.tone === "low" ? 0.5 : 1,
      }}
    >
      {top && (
        <span
          className="mono"
          style={{
            position: "absolute",
            left: -38,
            top: "50%",
            transform: "translateY(-50%) rotate(-90deg)",
            fontSize: 9,
            letterSpacing: "0.2em",
            color: "var(--persimmon-2)",
          }}
        >
          {t("landing.ranking.top_pick")}
        </span>
      )}
      {top && (
        <span
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: "var(--persimmon)",
          }}
        />
      )}

      <ScoreRing value={c.score} size={40} stroke={3} color={ringColor} delay={idx * 80} />

      <div>
        <div
          className="serif"
          style={{ fontSize: 18, letterSpacing: "-0.015em", lineHeight: 1.1 }}
        >
          {c.name}
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--ink-3)",
            marginTop: 2,
            letterSpacing: "0.04em",
          }}
        >
          {t(c.roleKey).toUpperCase()}
        </div>
      </div>

      <div
        className="mono"
        style={{ fontSize: 10, color: "var(--ink-2)", letterSpacing: "0.04em" }}
      >
        {expCity}
        <br />
        <span style={{ color: "var(--ink-4)" }}>{expWhere}</span>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {c.tags.slice(0, 3).map((tag) => (
          <span
            key={tag}
            className="mono"
            style={{
              fontSize: 9,
              padding: "2px 6px",
              background: "var(--paper)",
              border: "1px solid var(--ink-4)",
              letterSpacing: "0.06em",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div
        style={
          {
            fontSize: 12,
            color: "var(--ink-2)",
            lineHeight: 1.45,
            maxWidth: 260,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          } as CSSProperties
        }
      >
        &ldquo;{t(c.summaryKey)}&rdquo;
      </div>

      <div style={{ textAlign: "right" }}>
        <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
          {c.salaryKey ? t(c.salaryKey) : "—"}
        </span>
        <div
          className="mono"
          style={{ fontSize: 9, color: "var(--ink-4)", letterSpacing: "0.1em" }}
        >
          {t("landing.ranking.salary_unit")}
        </div>
      </div>
    </div>
  );
}

export function RankingMockup() {
  const { t } = useTranslation();
  return (
    <div
      style={{
        width: 720,
        fontFamily: "var(--font-manrope), sans-serif",
        position: "relative",
        background: "var(--paper-3)",
        color: "var(--ink)",
        border: "1.5px solid var(--ink)",
        boxShadow: "16px 16px 0 var(--ink), 16px 16px 0 1.5px var(--ink)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          background: "var(--ink)",
          color: "var(--paper-3)",
          fontFamily: "var(--font-jetbrains-mono),monospace",
          fontSize: 11,
          letterSpacing: "0.12em",
        }}
      >
        <span>TEZHR://DASHBOARD</span>
        <span style={{ color: "#8B8275" }}>/</span>
        <span>JOB #DES-042</span>
        <span
          style={{
            marginLeft: "auto",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span
            className="pulse-dot"
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "var(--persimmon)",
            }}
          />
          {t("landing.ranking.live")}
        </span>
      </div>

      <div
        style={{
          padding: "22px 24px 18px",
          borderBottom: "1.5px solid var(--ink)",
          display: "flex",
          alignItems: "flex-end",
          gap: 20,
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "var(--ink-3)",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            {t("landing.ranking.job_kicker")}
          </div>
          <h3
            className="serif"
            style={{
              margin: 0,
              fontSize: 34,
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {t("landing.ranking.job_title_prefix")}{" "}
            <em style={{ color: "var(--persimmon-2)" }}>
              {t("landing.ranking.job_title_role")}
            </em>
          </h3>
        </div>
        <div
          style={{
            display: "flex",
            gap: 0,
            fontFamily: "var(--font-jetbrains-mono),monospace",
            fontSize: 11,
          }}
        >
          <BigStat v="247" l={t("landing.ranking.stat_applications")} />
          <BigStat v="94" l={t("landing.ranking.stat_top_score")} accent />
          <BigStat v="30s" l={t("landing.ranking.stat_time")} last />
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 24px",
          borderBottom: "1px solid var(--ink)",
          background: "var(--paper-2)",
          fontSize: 11,
          fontFamily: "var(--font-jetbrains-mono),monospace",
          letterSpacing: "0.08em",
        }}
      >
        <span
          className="chip-ink"
          style={{
            background: "var(--ink)",
            color: "var(--paper-3)",
            borderColor: "var(--ink)",
          }}
        >
          {t("landing.ranking.chip_sort")}
        </span>
        <span className="chip-ink">{t("landing.ranking.chip_experience")}</span>
        <span className="chip-ink">{t("landing.ranking.chip_languages")}</span>
        <span style={{ marginLeft: "auto", color: "var(--ink-3)" }}>
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

export function AIPanel() {
  const { t } = useTranslation();
  const candidate = CANDIDATES[0];
  return (
    <div
      style={{
        width: 480,
        fontFamily: "var(--font-manrope), sans-serif",
        background: "var(--paper-3)",
        color: "var(--ink)",
        border: "1.5px solid var(--ink)",
        position: "relative",
        boxShadow: "12px 12px 0 var(--ikat)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 0,
          height: 0,
          borderStyle: "solid",
          borderWidth: "0 34px 34px 0",
          borderColor: "transparent var(--paper) transparent transparent",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 34,
          height: 34,
          background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,0.08) 50%)",
        }}
      />

      <div
        style={{
          padding: "18px 22px 14px",
          borderBottom: "1.5px solid var(--ink)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "var(--persimmon-2)",
              textTransform: "uppercase",
            }}
          >
            {t("landing.ai.kicker")}
          </div>
          <div
            className="serif"
            style={{ fontSize: 22, letterSpacing: "-0.02em", marginTop: 2 }}
          >
            {candidate.name}
          </div>
        </div>
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--ink-3)",
            textAlign: "right",
            letterSpacing: "0.08em",
          }}
        >
          TIME 03.8s
          <br />
          DATE 14·05·26
        </div>
      </div>

      <div
        style={{
          padding: "28px 22px",
          borderBottom: "1.5px solid var(--ink)",
          display: "flex",
          alignItems: "center",
          gap: 24,
          position: "relative",
          background:
            "linear-gradient(135deg, var(--paper-3) 60%, rgba(229,89,52,0.08))",
        }}
      >
        <div>
          <div
            className="serif"
            style={{
              fontSize: 120,
              lineHeight: 0.82,
              letterSpacing: "-0.05em",
              color: "var(--persimmon-2)",
            }}
          >
            {AI_SCORE}
          </div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "var(--ink-3)",
              marginTop: 4,
            }}
          >
            {t("landing.ai.match")}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: "inline-block",
              padding: "3px 10px",
              background: "var(--persimmon)",
              color: "var(--paper-3)",
              fontFamily: "var(--font-jetbrains-mono),monospace",
              fontSize: 10,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              transform: "rotate(-2deg)",
              marginBottom: 10,
            }}
          >
            {t("landing.ai.verdict")}
          </div>
          <p
            className="serif"
            style={{
              margin: 0,
              fontSize: 17,
              lineHeight: 1.3,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
              fontStyle: "italic",
            }}
          >
            {t("landing.ai.pull_quote")}
          </p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ padding: "18px 22px", borderRight: "1.5px solid var(--ink)" }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "var(--ikat)",
              marginBottom: 12,
            }}
          >
            {t("landing.ai.strengths")}
          </div>
          {AI_STRENGTH_KEYS.map((k, i) => (
            <div
              key={k}
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 10,
                fontSize: 12,
                lineHeight: 1.4,
                color: "var(--ink)",
              }}
            >
              <span
                className="serif"
                style={{ color: "var(--ikat)", fontSize: 14, marginTop: -1 }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{t(k)}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: "18px 22px" }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.16em",
              color: "var(--persimmon-2)",
              marginBottom: 12,
            }}
          >
            {t("landing.ai.gaps")}
          </div>
          {AI_GAP_KEYS.map((k, i) => (
            <div
              key={k}
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 10,
                fontSize: 12,
                lineHeight: 1.4,
                color: "var(--ink)",
              }}
            >
              <span
                className="serif"
                style={{
                  color: "var(--persimmon-2)",
                  fontSize: 14,
                  marginTop: -1,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{t(k)}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: "14px 22px",
          borderTop: "1.5px solid var(--ink)",
          display: "flex",
          gap: 14,
          background: "var(--paper-2)",
        }}
      >
        {AI_LANGS.map((l) => (
          <div key={l.code} style={{ flex: 1 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: "var(--font-jetbrains-mono),monospace",
                fontSize: 10,
                marginBottom: 4,
                letterSpacing: "0.08em",
              }}
            >
              <span>{l.code}</span>
              <span style={{ color: "var(--ink-3)" }}>{l.pct}%</span>
            </div>
            <div
              style={{
                height: 3,
                background: "var(--paper)",
                border: "1px solid var(--ink-4)",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${l.pct}%`,
                  background: "var(--ink)",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "14px 22px",
          borderTop: "1.5px solid var(--ink)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          background: "var(--ink)",
          color: "var(--paper-3)",
        }}
      >
        <span
          className="mono"
          style={{ fontSize: 10, letterSpacing: "0.16em", flex: 1 }}
        >
          {t("landing.ai.recommend_invite")}
        </span>
        <button
          type="button"
          style={{
            padding: "6px 12px",
            background: "var(--persimmon)",
            color: "var(--paper-3)",
            border: 0,
            fontFamily: "var(--font-manrope),sans-serif",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.02em",
            cursor: "pointer",
          }}
        >
          {t("landing.ai.interview_cta")}
        </button>
      </div>
    </div>
  );
}
