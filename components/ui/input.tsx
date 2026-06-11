"use client";

import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FieldMessage, Label } from "./field";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  error?: string;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  maxCharacters?: number;
  currentLength?: number;
  /** Visual sizing. `lg` is a 44px touch target for important mobile fields. */
  inputSize?: "md" | "lg";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      startAdornment,
      endAdornment,
      maxCharacters,
      currentLength,
      inputSize = "md",
      id,
      required,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hasError = Boolean(error);
    const describedBy = hasError
      ? `${inputId}-error`
      : helperText
        ? `${inputId}-helper`
        : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
        )}
        <div
          className={cn(
            "flex items-center gap-2 rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3",
            "transition-colors duration-150 ease-[var(--ease-standard)]",
            hasError
              ? "border-[var(--color-danger)]"
              : "border-[var(--color-line-strong)] focus-within:border-[var(--color-focus)]",
            "has-[input:disabled]:opacity-60",
            className,
          )}
        >
          {startAdornment && (
            <span className="shrink-0 text-[var(--color-text-muted)]">{startAdornment}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "w-full bg-transparent text-sm text-[var(--color-text)] outline-none",
              "placeholder:text-[var(--color-text-subtle)]",
              "disabled:cursor-not-allowed",
              inputSize === "lg" ? "h-11" : "h-10",
            )}
            aria-invalid={hasError || undefined}
            aria-describedby={describedBy}
            required={required}
            {...props}
          />
          {endAdornment && (
            <span className="shrink-0 text-[var(--color-text-muted)]">{endAdornment}</span>
          )}
        </div>
        {(hasError || helperText || maxCharacters !== undefined) && (
          <div className="flex items-center justify-between gap-2">
            {hasError ? (
              <FieldMessage tone="error" id={`${inputId}-error`}>
                {error}
              </FieldMessage>
            ) : helperText ? (
              <FieldMessage id={`${inputId}-helper`}>{helperText}</FieldMessage>
            ) : (
              <span />
            )}
            {maxCharacters !== undefined && (
              <span
                className={cn(
                  "data-mono text-xs",
                  (currentLength ?? 0) > maxCharacters
                    ? "text-[var(--color-danger)]"
                    : "text-[var(--color-text-subtle)]",
                )}
              >
                {currentLength ?? 0}/{maxCharacters}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
