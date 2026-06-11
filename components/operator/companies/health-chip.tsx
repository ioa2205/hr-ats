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
      <span className="nums font-[var(--font-mono)] text-[11px] text-[var(--color-text-subtle)]">
        —
      </span>
    );
  }
  const tone =
    score >= 70
      ? {
          bg: "bg-[var(--color-success-container)]",
          fg: "text-[var(--color-success)]",
          dot: "bg-[var(--color-success)]",
        }
      : score >= 40
        ? {
            bg: "bg-[var(--color-warning-container)]",
            fg: "text-[var(--color-warning)]",
            dot: "bg-[var(--color-warning)]",
          }
        : {
            bg: "bg-[var(--color-danger-container)]",
            fg: "text-[var(--color-danger)]",
            dot: "bg-[var(--color-danger)]",
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
