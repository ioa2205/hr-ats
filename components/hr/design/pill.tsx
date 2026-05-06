import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type PillTone =
  | "success"
  | "amber"
  | "danger"
  | "info"
  | "neutral"
  | "ink"
  | "persimmon"
  | "persimmon-solid"
  | "outline";

const toneClass: Record<PillTone, string> = {
  success: "bg-[var(--color-tez-green-tint)] text-[var(--color-tez-green)]",
  amber: "bg-[var(--color-tez-amber-tint)] text-[var(--color-tez-amber)]",
  danger: "bg-[var(--color-tez-red-tint)] text-[var(--color-tez-red)]",
  info: "bg-[var(--color-tez-blue-tint)] text-[var(--color-tez-blue)]",
  neutral: "bg-bone-2 text-ink-3 border-rule border",
  ink: "bg-ink text-paper",
  persimmon: "bg-persimmon-tint text-persimmon-2",
  "persimmon-solid": "bg-persimmon text-white font-semibold",
  outline: "bg-transparent border border-rule-2 text-ink-3",
};

export function Pill({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: PillTone;
  dot?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-[3px] px-1.5 py-[1px] text-[10.5px] font-medium leading-[1.5]",
        toneClass[tone],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className="inline-block h-[5px] w-[5px] rounded-full bg-current opacity-85"
        />
      )}
      {children}
    </span>
  );
}

export function StatusPill({
  status,
  label,
}: {
  status: "active" | "paused" | "closed" | "draft";
  label: string;
}) {
  const tone: PillTone =
    status === "active"
      ? "success"
      : status === "paused"
        ? "amber"
        : status === "draft"
          ? "outline"
          : "neutral";
  return (
    <Pill tone={tone} dot={status !== "draft"}>
      {label}
    </Pill>
  );
}

export function VerdictPill({
  verdict,
  labels,
}: {
  verdict: "recommend" | "review" | "reject" | "mismatch";
  labels: {
    recommend: string;
    review: string;
    reject: string;
    mismatch?: string;
  };
}) {
  if (verdict === "recommend") {
    return (
      <Pill tone="persimmon-solid">
        <SparklesGlyph />
        {labels.recommend}
      </Pill>
    );
  }
  if (verdict === "review") {
    return (
      <Pill tone="amber" dot>
        {labels.review}
      </Pill>
    );
  }
  if (verdict === "mismatch") {
    return (
      <Pill tone="danger">
        <FlagGlyph />
        {labels.mismatch ?? labels.reject}
      </Pill>
    );
  }
  return <Pill tone="neutral">{labels.reject}</Pill>;
}

function SparklesGlyph() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5z" />
      <path d="M19 14l.7 2.1L22 17l-2.3.9L19 20l-.7-2.1L16 17l2.3-.9z" />
      <path d="M5 16l.5 1.5L7 18l-1.5.5L5 20l-.5-1.5L3 18l1.5-.5z" />
    </svg>
  );
}

function FlagGlyph() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 22V4" />
      <path d="M4 4h13l-2 4 2 4H4" />
    </svg>
  );
}
