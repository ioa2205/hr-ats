"use client";

import { useId, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when the visible label is icon-only. */
  ariaLabel?: string;
  icon?: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  name?: string;
  size?: "sm" | "md";
  className?: string;
  "aria-label"?: string;
}

/**
 * Segmented control built on native radios (visually hidden) for free keyboard
 * navigation and form semantics. Use for 2–4 mutually exclusive view options.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  name,
  size = "md",
  className,
  ...aria
}: SegmentedControlProps<T>) {
  const generatedName = useId();
  const groupName = name ?? generatedName;

  return (
    <div
      role="radiogroup"
      aria-label={aria["aria-label"]}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] p-0.5",
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <label
            key={option.value}
            className={cn(
              "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-[var(--radius-sm)] font-medium transition-colors",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-3.5 text-sm",
              active
                ? "bg-[var(--color-surface)] text-[var(--color-text)] shadow-level-1"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
              "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-focus)]",
            )}
          >
            <input
              type="radio"
              name={groupName}
              value={option.value}
              checked={active}
              aria-label={option.ariaLabel}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.icon}
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
