import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Tighter padding for in-panel empties. */
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center",
        compact ? "py-10" : "py-16",
        className,
      )}
    >
      <div
        className={cn(
          "grid place-items-center rounded-[var(--radius-xl)] bg-[var(--color-surface-subtle)] text-[var(--color-text-subtle)]",
          compact ? "h-14 w-14 [&>svg]:h-7 [&>svg]:w-7" : "h-20 w-20 [&>svg]:h-9 [&>svg]:w-9",
        )}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
