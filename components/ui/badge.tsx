import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "accent" | "primary" | "neutral";

export type BadgeSize = "sm" | "md";
export type BadgeVariant = "default" | "dot" | "pulse";

export interface BadgeProps {
  tone?: BadgeTone;
  size?: BadgeSize;
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const toneStyles: Record<BadgeTone, { bg: string; text: string; dot: string }> = {
  success: {
    bg: "bg-[var(--color-success-container)]",
    text: "text-[var(--color-on-success-container)]",
    dot: "bg-[var(--color-success)]",
  },
  warning: {
    bg: "bg-[var(--color-warning-container)]",
    text: "text-[var(--color-on-warning-container)]",
    dot: "bg-[var(--color-warning)]",
  },
  danger: {
    bg: "bg-[var(--color-danger-container)]",
    text: "text-[var(--color-on-danger-container)]",
    dot: "bg-[var(--color-danger)]",
  },
  info: {
    bg: "bg-[var(--color-info-container)]",
    text: "text-[var(--color-on-info-container)]",
    dot: "bg-[var(--color-info)]",
  },
  primary: {
    bg: "bg-[var(--color-primary-container)]",
    text: "text-[var(--color-on-primary-container)]",
    dot: "bg-[var(--color-primary)]",
  },
  accent: {
    bg: "bg-[var(--color-accent-container)]",
    text: "text-[var(--color-on-accent-container)]",
    dot: "bg-[var(--color-accent)]",
  },
  neutral: {
    bg: "bg-[var(--color-surface-strong)]",
    text: "text-[var(--color-text-muted)]",
    dot: "bg-[var(--color-text-muted)]",
  },
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

export function Badge({
  tone = "neutral",
  size = "sm",
  variant = "default",
  children,
  className,
}: BadgeProps) {
  const styles = toneStyles[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] font-medium whitespace-nowrap",
        styles.bg,
        styles.text,
        sizeStyles[size],
        className,
      )}
    >
      {variant === "dot" && <span className={cn("h-2 w-2 rounded-full", styles.dot)} />}
      {variant === "pulse" && (
        <span className="relative flex h-2 w-2">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 motion-reduce:animate-none",
              styles.dot,
            )}
          />
          <span className={cn("relative inline-flex h-2 w-2 rounded-full", styles.dot)} />
        </span>
      )}
      {children}
    </span>
  );
}
