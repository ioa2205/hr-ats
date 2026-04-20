"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui";

interface Props {
  score: number | null;
  /** Reason tags from the API; optional. */
  reasons?: string[];
}

export function HealthChip({ score, reasons }: Props) {
  if (score === null || score === undefined) {
    return (
      <span className="nums font-[var(--font-tez-mono)] text-[11px] text-[var(--color-ink-5)]">
        —
      </span>
    );
  }
  const tone =
    score >= 70
      ? {
          bg: "bg-[var(--color-tez-green-tint)]",
          fg: "text-[var(--color-tez-green)]",
          dot: "bg-[var(--color-tez-green)]",
        }
      : score >= 40
        ? {
            bg: "bg-[var(--color-tez-amber-tint)]",
            fg: "text-[var(--color-tez-amber)]",
            dot: "bg-[var(--color-tez-amber)]",
          }
        : {
            bg: "bg-[var(--color-tez-red-tint)]",
            fg: "text-[var(--color-tez-red)]",
            dot: "bg-[var(--color-tez-red)]",
          };

  const chip = (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[11px] font-semibold ${tone.bg} ${tone.fg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
      <span className="nums tabular-nums">{score}</span>
    </span>
  );

  if (!reasons || reasons.length === 0) return chip;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{chip}</TooltipTrigger>
      <TooltipContent>
        <div className="flex flex-col gap-0.5">
          {reasons.map((r) => (
            <span key={r}>{r}</span>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
