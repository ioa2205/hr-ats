// Pure SVG/CSS-only primitives. NOT a client module — so server components
// can import and render them directly (no RSC serialization issues).

interface IconProps {
  size?: number;
  color?: string;
}

export function ArrowIcon({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M2 8h12M10 3l5 5-5 5"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CheckIcon({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8.5 L6.5 12 L13 4.5"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function StarIcon({ size = 14, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <path d="M8 1 L10 6 L15 6 L11 9.5 L12.5 15 L8 11.5 L3.5 15 L5 9.5 L1 6 L6 6 Z" />
    </svg>
  );
}

export function TelegramIcon({ size = 18, color = "currentColor" }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M20.7 4.3 3.4 11c-1.2.5-1.2 1.2-.2 1.5l4.4 1.4 10.2-6.4c.5-.3.9-.1.5.2l-8.3 7.5-.3 4.5c.5 0 .7-.2 1-.5l2.3-2.2 4.7 3.5c.9.5 1.5.2 1.7-.8l3.1-14.5c.3-1.3-.4-1.8-1.3-1.5Z" />
    </svg>
  );
}

export function HandArrowIcon({
  w = 100,
  color = "#C1440E",
  rotate = 0,
}: {
  w?: number;
  color?: string;
  rotate?: number;
}) {
  return (
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
  );
}

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
