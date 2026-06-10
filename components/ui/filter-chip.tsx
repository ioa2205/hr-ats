"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  active?: boolean;
  count?: number | null;
  icon?: ReactNode;
  /** When set, renders a remove (×) affordance and calls this instead of toggling. */
  onRemove?: () => void;
  removeLabel?: string;
}

/**
 * Toggle/filter chip. Uses `aria-pressed` so screen readers announce the
 * on/off state — color is never the only signal.
 */
export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(
  ({ className, active = false, count, icon, children, onRemove, removeLabel = "Remove", ...props }, ref) => {
    return (
      <span className="inline-flex items-center">
        <button
          ref={ref}
          type="button"
          aria-pressed={active}
          className={cn(
            "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[var(--radius-full)] border px-3 text-sm font-medium transition-colors",
            active
              ? "border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]"
              : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]",
            onRemove && "rounded-r-none border-r-0 pr-2",
            className,
          )}
          {...props}
        >
          {icon && <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>}
          {children}
          {count != null && (
            <span
              className={cn(
                "data-mono text-xs",
                active ? "text-[var(--color-on-primary-container)]" : "text-[var(--color-text-subtle)]",
              )}
            >
              {count}
            </span>
          )}
        </button>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={removeLabel}
            className={cn(
              "inline-flex h-8 items-center rounded-r-[var(--radius-full)] border border-l-0 pr-2.5 pl-1 transition-colors",
              active
                ? "border-[var(--color-primary)] bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:text-[var(--color-primary)]"
                : "border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
            )}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </span>
    );
  },
);

FilterChip.displayName = "FilterChip";
