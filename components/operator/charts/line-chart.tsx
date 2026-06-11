"use client";

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";

interface Point {
  day: string; // ISO date
  value: number;
}

interface Props {
  data: Point[];
  height?: number;
  stroke?: string;
  fill?: string;
  format?: (v: number) => string;
}

const PAD = { top: 10, right: 8, bottom: 18, left: 32 } as const;
const GRID_LINES = 3;

/**
 * Responsive native-SVG line chart. Hover shows a date + formatted-value
 * tooltip. Uses CSS vars so dark mode flips the grid + text automatically.
 */
export function LineChart({
  data,
  height = 160,
  stroke = "var(--color-accent)",
  fill,
  format = (v) => String(v),
}: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const { linePath, areaPath, xs, ys, max, min } = useMemo(() => {
    if (data.length === 0)
      return {
        linePath: "",
        areaPath: "",
        xs: [] as number[],
        ys: [] as number[],
        max: 0,
        min: 0,
      };
    const vals = data.map((d) => d.value);
    const max = Math.max(...vals, 1);
    const min = 0;
    const range = max - min || 1;
    const width = 100; // viewBox x range; scaled by viewport
    const innerW = width - PAD.left - PAD.right;
    const innerH = height - PAD.top - PAD.bottom;
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
    const xs = data.map((_, i) => PAD.left + i * stepX);
    const ys = data.map((d) => PAD.top + (1 - (d.value - min) / range) * innerH);
    const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${ys[i].toFixed(2)}`).join(" ");
    const last = xs[xs.length - 1];
    const first = xs[0];
    const baseline = height - PAD.bottom;
    const area = fill
      ? `${line} L${last.toFixed(2)} ${baseline} L${first.toFixed(2)} ${baseline} Z`
      : "";
    return { linePath: line, areaPath: area, xs, ys, max, min };
  }, [data, height, fill]);

  function onMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (data.length === 0 || xs.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * 100;
    // Nearest index
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < xs.length; i++) {
      const d = Math.abs(xs[i] - relX);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setHoverIdx(best);
  }

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-[11px] text-[var(--color-text-subtle)]"
        style={{ height }}
      >
        —
      </div>
    );
  }

  const yTicks = Array.from({ length: GRID_LINES + 1 }, (_, i) => {
    const t = i / GRID_LINES;
    const y = PAD.top + (1 - t) * (height - PAD.top - PAD.bottom);
    const label = format(min + t * (max - min));
    return { y, label };
  });

  const firstDay = data[0]?.day ?? "";
  const lastDay = data[data.length - 1]?.day ?? "";

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
        width="100%"
        height={height}
        onPointerMove={onMove}
        onPointerLeave={() => setHoverIdx(null)}
        className="block touch-none"
      >
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD.left}
              x2={100 - PAD.right}
              y1={t.y}
              y2={t.y}
              stroke="var(--color-line)"
              strokeWidth={0.3}
            />
          </g>
        ))}
        {fill && <path d={areaPath} fill={fill} opacity={0.3} />}
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hoverIdx !== null && xs[hoverIdx] !== undefined && (
          <g>
            <line
              x1={xs[hoverIdx]}
              x2={xs[hoverIdx]}
              y1={PAD.top}
              y2={height - PAD.bottom}
              stroke="var(--color-text-subtle)"
              strokeDasharray="2 2"
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={xs[hoverIdx]}
              cy={ys[hoverIdx]}
              r={1.8}
              fill="var(--color-canvas)"
              stroke={stroke}
              strokeWidth={0.8}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        )}
      </svg>
      {/* Y-axis labels */}
      <div className="pointer-events-none absolute inset-0">
        {yTicks.map((t, i) => (
          <span
            key={i}
            className="font-[var(--font-mono)] absolute text-[9px] text-[var(--color-text-subtle)]"
            style={{ left: 0, top: t.y - 5, width: 28, textAlign: "right" }}
          >
            {t.label}
          </span>
        ))}
      </div>
      <div className="font-[var(--font-mono)] mt-1 flex justify-between text-[10px] text-[var(--color-text-subtle)]">
        <span>{firstDay}</span>
        <span>{lastDay}</span>
      </div>
      {hoverIdx !== null && data[hoverIdx] && (
        <div
          className="pointer-events-none absolute -top-8 rounded-[var(--radius-sm)] bg-[var(--color-text)] px-2 py-1 text-[11px] text-[var(--color-canvas)] shadow-[var(--shadow-level-2)]"
          style={{
            left: `calc(${(xs[hoverIdx] / 100) * 100}% - 40px)`,
          }}
        >
          <span className="font-[var(--font-mono)] opacity-70">{data[hoverIdx].day}</span>
          <span className="ml-2 font-semibold">{format(data[hoverIdx].value)}</span>
        </div>
      )}
    </div>
  );
}
