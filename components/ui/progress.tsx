import { cn } from "@/lib/utils";

export type ProgressTone = "primary" | "success" | "warning" | "danger" | "accent";

const toneFill: Record<ProgressTone, string> = {
  primary: "bg-[var(--color-primary)]",
  success: "bg-[var(--color-success)]",
  warning: "bg-[var(--color-warning)]",
  danger: "bg-[var(--color-danger)]",
  accent: "bg-[var(--color-accent)]",
};

export interface ProgressProps {
  /** 0–100. Omit (or null) for an indeterminate bar. */
  value?: number | null;
  tone?: ProgressTone;
  size?: "sm" | "md";
  /** Accessible name (e.g. "Upload progress"). */
  label?: string;
  className?: string;
}

/** Linear progress / meter. Indeterminate when `value` is null/undefined. */
export function Progress({ value, tone = "primary", size = "md", label, className }: ProgressProps) {
  const indeterminate = value === null || value === undefined;
  const clamped = indeterminate ? 0 : Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={indeterminate ? undefined : 0}
      aria-valuemax={indeterminate ? undefined : 100}
      aria-valuenow={indeterminate ? undefined : Math.round(clamped)}
      className={cn(
        "w-full overflow-hidden rounded-[var(--radius-full)] bg-[var(--color-surface-strong)]",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
    >
      <div
        className={cn(
          "h-full rounded-[var(--radius-full)] transition-[width] duration-300 ease-[var(--ease-emphasized)] motion-reduce:transition-none",
          toneFill[tone],
          indeterminate && "w-full animate-pulse motion-reduce:animate-none",
        )}
        style={indeterminate ? undefined : { width: `${clamped}%` }}
      />
    </div>
  );
}
