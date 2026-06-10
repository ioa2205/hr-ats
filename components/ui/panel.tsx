import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Panel — the data-surface container (8px radius, hairline border). Use for
 * tables, lists, and grouped data regions. For interactive/marketing content
 * surfaces use `Card` (larger radius).
 */
export const Panel = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]",
        className,
      )}
      {...props}
    />
  ),
);
Panel.displayName = "Panel";

export function PanelHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-b border-[var(--color-line)] px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

export function PanelTitle({
  count,
  children,
  className,
}: {
  count?: number | string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm font-semibold text-[var(--color-text)]",
        className,
      )}
    >
      {children}
      {count != null && (
        <span className="data-mono rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
          {count}
        </span>
      )}
    </div>
  );
}

export function PanelBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4", className)} {...props} />;
}

export function PanelFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 border-t border-[var(--color-line)] px-4 py-3",
        className,
      )}
      {...props}
    />
  );
}

/**
 * SectionHeader — a page/section title region with optional description and
 * trailing actions. Wraps to stack on narrow screens.
 */
export function SectionHeader({
  title,
  description,
  actions,
  className,
  as: Heading = "h2",
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <Heading className="text-xl font-bold tracking-[-0.02em] text-[var(--color-text)]">
          {title}
        </Heading>
        {description && (
          <p className="max-w-2xl text-sm text-[var(--color-text-muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
