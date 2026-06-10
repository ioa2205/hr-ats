"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Called when the clear (×) button is pressed. */
  onClear?: () => void;
  /** Accessible label for the clear button (localized by the consumer). */
  clearLabel?: string;
  inputSize?: "md" | "lg";
}

/**
 * Search input with a leading icon and a clear button that appears once there
 * is a value. Renders `type="search"` (role=searchbox) for assistive tech.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  (
    { className, value, onClear, clearLabel = "Clear search", inputSize = "md", id, ...props },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hasValue = value !== undefined && value !== null && String(value).length > 0;

    return (
      <div
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3",
          "transition-colors duration-150 ease-[var(--ease-standard)] focus-within:border-[var(--color-focus)]",
          className,
        )}
      >
        <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
        <input
          ref={ref}
          id={inputId}
          type="search"
          value={value}
          className={cn(
            "w-full bg-transparent text-sm text-[var(--color-text)] outline-none",
            "placeholder:text-[var(--color-text-subtle)]",
            "[&::-webkit-search-cancel-button]:appearance-none",
            inputSize === "lg" ? "h-11" : "h-10",
          )}
          {...props}
        />
        {hasValue && onClear && (
          <button
            type="button"
            onClick={onClear}
            aria-label={clearLabel}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-[var(--radius-sm)] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  },
);

SearchField.displayName = "SearchField";
