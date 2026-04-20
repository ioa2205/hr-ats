import { cn } from "@/lib/utils";

export function ScoreMini({ score, persimmon = false }: { score: number; persimmon?: boolean }) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 text-[13px] font-semibold leading-none tracking-[-0.01em]",
        persimmon ? "text-persimmon-2" : "text-ink",
      )}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      <span>{score}</span>
      <span
        className="border-rule bg-bone-2 relative inline-block h-1 w-9 overflow-hidden rounded-[2px] border"
        aria-hidden
      >
        <span
          className="absolute inset-y-0 left-0 rounded-[2px]"
          style={{
            width: `${pct}%`,
            background: persimmon ? "var(--color-persimmon)" : "var(--color-ink-3)",
          }}
        />
      </span>
    </div>
  );
}

export function ScoreRing({
  score,
  size = 96,
  stroke = 6,
  persimmon = false,
}: {
  score: number;
  size?: number;
  stroke?: number;
  persimmon?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - score / 100);
  const color = persimmon
    ? "var(--color-persimmon)"
    : score >= 85
      ? "var(--color-tez-green)"
      : score >= 65
        ? "var(--color-tez-amber)"
        : "var(--color-tez-red)";
  const numSize = Math.round(size * 0.42);
  return (
    <div
      className="relative inline-grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--color-bone-2)"
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
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div
        className="absolute font-bold leading-none tracking-[-0.02em]"
        style={{
          fontSize: numSize,
          color: persimmon ? "var(--color-persimmon)" : "var(--color-ink)",
        }}
      >
        {score}
      </div>
    </div>
  );
}
