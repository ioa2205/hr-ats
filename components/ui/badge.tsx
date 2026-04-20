import { cn } from "@/lib/utils";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

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
    bg: "bg-success-container",
    text: "text-success",
    dot: "bg-success",
  },
  warning: {
    bg: "bg-warning-container",
    text: "text-warning",
    dot: "bg-warning",
  },
  danger: {
    bg: "bg-danger-container",
    text: "text-danger",
    dot: "bg-danger",
  },
  info: {
    bg: "bg-primary-container",
    text: "text-primary",
    dot: "bg-primary",
  },
  neutral: {
    bg: "bg-surface-container-high",
    text: "text-on-surface-variant",
    dot: "bg-on-surface-variant",
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
        "inline-flex items-center gap-1.5 rounded-[var(--radius-full)] font-medium",
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
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
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
