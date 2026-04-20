"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label?: string;
  helperText?: string;
  error?: string;
  startAdornment?: ReactNode;
  endAdornment?: ReactNode;
  maxCharacters?: number;
  currentLength?: number;
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
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const hasError = Boolean(error);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-on-surface text-sm font-medium">
            {label}
          </label>
        )}
        <div
          className={cn(
            "bg-surface flex items-center gap-2 rounded-[var(--radius-md)] border px-3",
            "transition-colors duration-200 ease-[var(--ease-standard)]",
            hasError ? "border-danger" : "border-outline-variant focus-within:border-primary",
            className,
          )}
        >
          {startAdornment && <span className="text-on-surface-variant">{startAdornment}</span>}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "text-on-surface h-10 w-full bg-transparent text-sm outline-none",
              "placeholder:text-on-surface-variant/60",
            )}
            aria-invalid={hasError}
            aria-describedby={
              hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            {...props}
          />
          {endAdornment && <span className="text-on-surface-variant">{endAdornment}</span>}
        </div>
        <div className="flex items-center justify-between">
          {hasError ? (
            <p id={`${inputId}-error`} className="text-danger text-xs" role="alert">
              {error}
            </p>
          ) : helperText ? (
            <p id={`${inputId}-helper`} className="text-on-surface-variant text-xs">
              {helperText}
            </p>
          ) : (
            <span />
          )}
          {maxCharacters !== undefined && (
            <span className="nums text-on-surface-variant text-xs">
              {currentLength ?? 0}/{maxCharacters}
            </span>
          )}
        </div>
      </div>
    );
  },
);

Input.displayName = "Input";
