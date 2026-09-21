"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  helper?: string;
  error?: string;
  endSlot?: ReactNode;
}

/**
 * Auth input field. Keeps a visible, associated `<label>` (so screen readers
 * and the auth E2E `getByLabel` lookups stay correct), a 44px touch target,
 * the Tez Lapis focus boundary, and an optional end-of-label slot (e.g. the
 * "forgot password" link). Semantic tokens only.
 */
export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, helper, error, endSlot, className, id, name, ...rest }, ref) => {
    const fieldId = id ?? `f-${(name ?? label).toLowerCase().replace(/\s+/g, "-")}`;
    const describedBy = error ? `${fieldId}-error` : helper ? `${fieldId}-helper` : undefined;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor={fieldId}
            className="text-[13.5px] font-semibold tracking-[-0.01em] text-[var(--color-text)]"
          >
            {label}
          </label>
          {endSlot}
        </div>
        <input
          ref={ref}
          id={fieldId}
          name={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
          className={cn(
            "field-focus-ring flex h-[52px] w-full items-center rounded-[12px] border bg-[var(--color-surface)] px-4 text-[15px] text-[var(--color-text)] transition-colors outline-none",
            "placeholder:text-[var(--color-text-subtle)]",
            rest.readOnly &&
              "cursor-default bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]",
            error
              ? "border-[var(--color-danger)] focus:border-[var(--color-danger)]"
              : "border-[var(--color-line-strong)]",
            className,
          )}
        />
        {error ? (
          <p
            id={`${fieldId}-error`}
            className="text-[12.5px] text-[var(--color-danger)]"
            role="alert"
          >
            {error}
          </p>
        ) : helper ? (
          <p id={`${fieldId}-helper`} className="text-[12.5px] text-[var(--color-text-muted)]">
            {helper}
          </p>
        ) : null}
      </div>
    );
  },
);
AuthField.displayName = "AuthField";
