"use client";

import type { ReactNode } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertTone = "info" | "success" | "warning" | "danger" | "neutral";

const toneConfig: Record<
  AlertTone,
  { container: string; icon: string; defaultIcon: LucideIcon; live: "polite" | "assertive" }
> = {
  info: {
    container:
      "border-[color-mix(in_srgb,var(--color-info)_35%,transparent)] bg-[var(--color-info-container)] text-[var(--color-on-info-container)]",
    icon: "text-[var(--color-info)]",
    defaultIcon: Info,
    live: "polite",
  },
  success: {
    container:
      "border-[color-mix(in_srgb,var(--color-success)_35%,transparent)] bg-[var(--color-success-container)] text-[var(--color-on-success-container)]",
    icon: "text-[var(--color-success)]",
    defaultIcon: CheckCircle,
    live: "polite",
  },
  warning: {
    container:
      "border-[color-mix(in_srgb,var(--color-warning)_40%,transparent)] bg-[var(--color-warning-container)] text-[var(--color-on-warning-container)]",
    icon: "text-[var(--color-warning)]",
    defaultIcon: AlertTriangle,
    live: "polite",
  },
  danger: {
    container:
      "border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)] bg-[var(--color-danger-container)] text-[var(--color-on-danger-container)]",
    icon: "text-[var(--color-danger)]",
    defaultIcon: AlertCircle,
    live: "assertive",
  },
  neutral: {
    container: "border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-[var(--color-text)]",
    icon: "text-[var(--color-text-muted)]",
    defaultIcon: Info,
    live: "polite",
  },
};

export interface AlertProps {
  tone?: AlertTone;
  title?: ReactNode;
  children?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  onDismiss?: () => void;
  dismissLabel?: string;
  className?: string;
}

/**
 * Inline callout for contextual feedback that lives in the page (not a toast).
 * Status is conveyed by icon + text, never color alone.
 */
export function Alert({
  tone = "info",
  title,
  children,
  icon,
  action,
  onDismiss,
  dismissLabel = "Dismiss",
  className,
}: AlertProps) {
  const config = toneConfig[tone];
  const DefaultIcon = config.defaultIcon;

  return (
    <div
      role={config.live === "assertive" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-md)] border p-4 text-sm",
        config.container,
        className,
      )}
    >
      <span className={cn("mt-0.5 shrink-0", config.icon)} aria-hidden="true">
        {icon ?? <DefaultIcon className="h-5 w-5" />}
      </span>
      <div className="flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && "mt-1", "text-current/90")}>{children}</div>}
        {action && <div className="mt-3 flex flex-wrap gap-2">{action}</div>}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={dismissLabel}
          className="-mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-[var(--radius-sm)] opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export interface InlineMessageProps {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}

/** Compact one-line feedback for under fields, list rows, or section headers. */
export function InlineMessage({ tone = "info", children, className }: InlineMessageProps) {
  const config = toneConfig[tone];
  const Icon = config.defaultIcon;
  return (
    <p
      role={config.live === "assertive" ? "alert" : "status"}
      className={cn("flex items-center gap-1.5 text-xs", className)}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", config.icon)} aria-hidden="true" />
      <span className="text-[var(--color-text-muted)]">{children}</span>
    </p>
  );
}
