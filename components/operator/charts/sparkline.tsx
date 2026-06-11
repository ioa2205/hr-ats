"use client";

import { useMemo } from "react";

interface Props {
  values: number[];
  width?: number;
  height?: number;
  /** CSS variable for stroke; defaults to persimmon */
  stroke?: string;
  /** CSS variable for fill under the line; omit for no fill */
  fill?: string;
  ariaLabel?: string;
}

/**
 * Zero-dep SVG sparkline. Scales to viewBox so the stroke stays crisp at any
 * rendered size. Values are interpreted as time-ordered (oldest → newest).
 */
export function Sparkline({
  values,
  width = 120,
  height = 32,
  stroke = "var(--color-accent)",
  fill,
  ariaLabel,
}: Props) {
  const { linePath, areaPath } = useMemo(() => {
    if (values.length === 0) return { linePath: "", areaPath: "" };
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const pad = 2;
    const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
    const points = values.map((v, i) => {
      const x = pad + i * stepX;
      const y = height - pad - ((v - min) / range) * (height - pad * 2);
      return [x, y] as const;
    });
    const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ");
    const area = fill
      ? `${line} L${(pad + (values.length - 1) * stepX).toFixed(2)} ${height - pad} L${pad} ${height - pad} Z`
      : "";
    return { linePath: line, areaPath: area };
  }, [values, width, height, fill]);

  if (values.length === 0) {
    return (
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={ariaLabel ?? "no data"}
        className="block"
      >
        <line
          x1={2}
          y1={height / 2}
          x2={width - 2}
          y2={height / 2}
          stroke="var(--color-line-strong)"
          strokeDasharray="2 3"
          strokeWidth={1}
        />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={ariaLabel}
      className="block"
    >
      {fill && <path d={areaPath} fill={fill} opacity={0.35} />}
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
