"use client";

import { type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { IconButton } from "./icon-button";

/**
 * MasterDetail — the shared list/detail scaffold used by candidate review.
 *
 * - Desktop (lg+): list and detail side by side (split view).
 * - Tablet/phone: one pane at a time. When `hasSelection` is true the detail
 *   fills the screen; otherwise the list is shown. (For tablet you can instead
 *   render the detail inside a `Sheet` for a drawer.)
 *
 * The detail content is built from `DetailPane` + `DetailHeader`/`DetailBody`/
 * `DetailActionBar`, so the same markup works in split, drawer, and full-page
 * modes.
 */
export function MasterDetail({
  list,
  detail,
  hasSelection,
  listWidth = "22rem",
  className,
}: {
  list: ReactNode;
  detail: ReactNode;
  hasSelection: boolean;
  listWidth?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex min-h-0 flex-1 lg:gap-4", className)}>
      <div
        className={cn(
          "min-h-0 w-full shrink-0 flex-col lg:flex lg:w-[var(--master-w)]",
          hasSelection ? "hidden lg:flex" : "flex",
        )}
        style={{ ["--master-w" as string]: listWidth }}
      >
        {list}
      </div>
      <div className={cn("min-h-0 flex-1 flex-col", hasSelection ? "flex" : "hidden lg:flex")}>
        {detail}
      </div>
    </div>
  );
}

/** Surface wrapper for a detail pane (split column, drawer body, or full page). */
export function DetailPane({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/**
 * Sticky detail header. `onBack` renders a back affordance shown on small
 * screens (hidden on desktop split view, where the list stays visible).
 */
export function DetailHeader({
  title,
  subtitle,
  actions,
  onBack,
  backLabel = "Back",
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3",
        className,
      )}
    >
      {onBack && (
        <IconButton
          aria-label={backLabel}
          variant="ghost"
          size="md"
          onClick={onBack}
          className="lg:hidden"
        >
          <ArrowLeft />
        </IconButton>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-[var(--color-text)]">{title}</div>
        {subtitle && (
          <div className="truncate text-sm text-[var(--color-text-muted)]">{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function DetailBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto p-4 sm:p-5", className)}>{children}</div>;
}

/**
 * Sticky action bar pinned to the bottom of a detail pane — keeps primary
 * candidate actions in the thumb zone on mobile. Use `lg` buttons (44px) here.
 */
export function DetailActionBar({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "sticky bottom-0 z-10 flex items-center gap-2 border-t border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3",
        "pb-[max(0.75rem,env(safe-area-inset-bottom))]",
        className,
      )}
    >
      {children}
    </div>
  );
}
