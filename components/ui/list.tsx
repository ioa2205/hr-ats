"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

/** Vertical list container with hairline dividers. Use for master lists. */
export function DataList({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      role="list"
      className={cn(
        "divide-y divide-[var(--color-line)] overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]",
        className,
      )}
      {...props}
    >
      {children}
    </ul>
  );
}

export interface ListRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
  asChild?: boolean;
}

/**
 * Selectable list row for master/detail patterns. Renders a 44px+ tap target,
 * marks the active item with `aria-current` and a Lapis rail (not color alone).
 */
export const ListRow = forwardRef<HTMLButtonElement, ListRowProps>(
  ({ className, leading, title, subtitle, meta, trailing, selected, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <li className="relative">
        <Comp
          ref={ref}
          type={asChild ? undefined : "button"}
          aria-current={selected ? "true" : undefined}
          className={cn(
            "flex min-h-[3.25rem] w-full items-center gap-3 px-4 py-3 text-left transition-colors",
            selected
              ? "bg-[var(--color-primary-container)]"
              : "hover:bg-[var(--color-surface-subtle)]",
            className,
          )}
          {...props}
        >
          {selected && (
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-1 bg-[var(--color-primary)]"
            />
          )}
          {leading && <span className="shrink-0">{leading}</span>}
          <span className="min-w-0 flex-1">
            <span className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  "truncate text-sm font-medium",
                  selected
                    ? "text-[var(--color-on-primary-container)]"
                    : "text-[var(--color-text)]",
                )}
              >
                {title}
              </span>
              {meta && (
                <span className="shrink-0 text-xs text-[var(--color-text-subtle)]">{meta}</span>
              )}
            </span>
            {subtitle && (
              <span className="mt-0.5 block truncate text-xs text-[var(--color-text-muted)]">
                {subtitle}
              </span>
            )}
          </span>
          {trailing && <span className="shrink-0">{trailing}</span>}
        </Comp>
      </li>
    );
  },
);

ListRow.displayName = "ListRow";
