"use client";

import type { ReactNode } from "react";
import {
  Check,
  CircleDashed,
  Flag,
  Minus,
  Sparkles,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

/**
 * AI assessment primitives. The product rule: AI is advisory, never the final
 * hiring decision. Scores are rendered in the Lapis "intelligence" role (not as
 * a green/amber/red verdict), always carry an explicit label, and are paired
 * with evidence, gaps, and analysis status. Human decisions live elsewhere.
 */

export interface AIFitScoreProps {
  /** 0–100. */
  score: number;
  /** Localized label, e.g. "AI fit score". Always shown so the number is never mistaken for a verdict. */
  label: string;
  /** Optional textual band, e.g. "Strong fit" — conveys level without color-coding. */
  band?: string;
  size?: number;
  variant?: "ring" | "compact";
  className?: string;
}

export function AIFitScore({
  score,
  label,
  band,
  size = 96,
  variant = "ring",
  className,
}: AIFitScoreProps) {
  const pct = Math.max(0, Math.min(100, score));

  if (variant === "compact") {
    return (
      <span
        className={cn("inline-flex items-center gap-2", className)}
        aria-label={`${label}: ${pct} / 100`}
      >
        <span className="inline-flex items-baseline gap-0.5">
          <span className="data-mono text-base font-bold text-[var(--color-primary)]">{pct}</span>
          <span className="data-mono text-[10px] text-[var(--color-text-subtle)]">/100</span>
        </span>
        <span
          className="relative inline-block h-1.5 w-12 overflow-hidden rounded-full bg-[var(--color-surface-strong)]"
          aria-hidden="true"
        >
          <span
            className="absolute inset-y-0 left-0 rounded-full bg-[var(--color-primary)]"
            style={{ width: `${pct}%` }}
          />
        </span>
      </span>
    );
  }

  const stroke = Math.max(5, Math.round(size * 0.07));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className="relative inline-grid place-items-center"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`${label}: ${pct} / 100`}
      >
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--color-surface-strong)"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--color-primary)"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.6s var(--ease-emphasized)" }}
          />
        </svg>
        <div className="absolute flex flex-col items-center leading-none">
          <span
            className="data-mono font-bold tracking-[-0.02em] text-[var(--color-text)]"
            style={{ fontSize: Math.round(size * 0.32) }}
          >
            {pct}
          </span>
        </div>
      </div>
      <div className="flex flex-col items-center gap-0.5 text-center">
        <span className="inline-flex items-center gap-1 text-xs font-semibold tracking-[0.02em] text-[var(--color-primary)] uppercase">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          {label}
        </span>
        {band && <span className="text-sm font-medium text-[var(--color-text)]">{band}</span>}
      </div>
    </div>
  );
}

/**
 * Small labelled marker that flags AI-generated, advisory output. Place it
 * beside any AI text so users always know what is machine-generated.
 */
export function AIAssessmentLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-[var(--color-primary-container)] px-2.5 py-1 text-xs font-semibold text-[var(--color-on-primary-container)]",
        className,
      )}
    >
      <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

type AssessmentKind = "strength" | "gap" | "requirement-met" | "requirement-unmet";

const kindConfig: Record<AssessmentKind, { icon: LucideIcon; tone: string }> = {
  strength: { icon: Check, tone: "text-[var(--color-success)]" },
  gap: { icon: Minus, tone: "text-[var(--color-text-subtle)]" },
  "requirement-met": { icon: Check, tone: "text-[var(--color-success)]" },
  "requirement-unmet": { icon: Flag, tone: "text-[var(--color-warning)]" },
};

/**
 * One evidence/gap/requirement line. Each has a distinct icon so meaning is
 * never carried by color alone. An unmet requirement is flagged, not treated as
 * an automatic rejection.
 */
export function AssessmentRow({
  kind,
  children,
  className,
}: {
  kind: AssessmentKind;
  children: ReactNode;
  className?: string;
}) {
  const { icon: Icon, tone } = kindConfig[kind];
  return (
    <li className={cn("flex items-start gap-2 text-sm text-[var(--color-text)]", className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} strokeWidth={2.5} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export function AssessmentList({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <ul className={cn("flex flex-col gap-2", className)}>{children}</ul>;
}

export type AnalysisStatusValue = "queued" | "processing" | "complete" | "failed";

const statusConfig: Record<
  AnalysisStatusValue,
  { icon: LucideIcon | null; container: string; iconClass: string }
> = {
  queued: {
    icon: CircleDashed,
    container: "bg-[var(--color-surface-strong)] text-[var(--color-text-muted)]",
    iconClass: "text-[var(--color-text-muted)]",
  },
  processing: {
    icon: null,
    container: "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]",
    iconClass: "text-[var(--color-primary)]",
  },
  complete: {
    icon: Sparkles,
    container: "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]",
    iconClass: "text-[var(--color-primary)]",
  },
  failed: {
    icon: TriangleAlert,
    container: "bg-[var(--color-danger-container)] text-[var(--color-on-danger-container)]",
    iconClass: "text-[var(--color-danger)]",
  },
};

/** Shows where AI analysis is in its lifecycle. `label` is localized by caller. */
export function AnalysisStatus({
  status,
  label,
  className,
}: {
  status: AnalysisStatusValue;
  label: string;
  className?: string;
}) {
  const config = statusConfig[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] px-2.5 py-1 text-xs font-medium",
        config.container,
        className,
      )}
    >
      {status === "processing" ? (
        <Spinner size="sm" label={label} className={cn("h-3.5 w-3.5", config.iconClass)} />
      ) : Icon ? (
        <Icon className={cn("h-3.5 w-3.5", config.iconClass)} aria-hidden="true" />
      ) : null}
      {label}
    </span>
  );
}
