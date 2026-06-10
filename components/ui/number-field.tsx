"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldMessage, Label } from "./field";

export interface NumberFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange" | "value"> {
  label?: string;
  helperText?: string;
  error?: string;
  value: number | "";
  onValueChange: (value: number | "") => void;
  min?: number;
  max?: number;
  step?: number;
  /** Accessible labels for the stepper buttons (localized by the consumer). */
  decrementLabel?: string;
  incrementLabel?: string;
}

/**
 * Numeric field with accessible stepper buttons. Uses `inputMode="numeric"` so
 * mobile keyboards show the number pad, and clamps to min/max on step.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      value,
      onValueChange,
      min,
      max,
      step = 1,
      decrementLabel = "Decrease",
      incrementLabel = "Increase",
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const hasError = Boolean(error);
    const current = value === "" ? null : value;

    const clamp = (n: number) => {
      let next = n;
      if (min !== undefined) next = Math.max(min, next);
      if (max !== undefined) next = Math.min(max, next);
      return next;
    };

    const adjust = (delta: number) => {
      const base = current ?? min ?? 0;
      onValueChange(clamp(base + delta));
    };

    const stepperClass =
      "grid h-9 w-9 shrink-0 place-items-center text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-40";

    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <div
          className={cn(
            "flex items-center rounded-[var(--radius-md)] border bg-[var(--color-surface)]",
            "transition-colors duration-150 ease-[var(--ease-standard)]",
            hasError
              ? "border-[var(--color-danger)]"
              : "border-[var(--color-line-strong)] focus-within:border-[var(--color-focus)]",
            disabled && "opacity-60",
            className,
          )}
        >
          <button
            type="button"
            className={cn(stepperClass, "rounded-l-[var(--radius-md)] border-r border-[var(--color-line)]")}
            onClick={() => adjust(-step)}
            disabled={disabled || (min !== undefined && current !== null && current <= min)}
            aria-label={decrementLabel}
          >
            <Minus className="h-4 w-4" />
          </button>
          <input
            ref={ref}
            id={inputId}
            type="number"
            inputMode="numeric"
            value={value}
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            aria-invalid={hasError || undefined}
            aria-describedby={
              hasError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
            onChange={(e) => {
              const raw = e.target.value;
              onValueChange(raw === "" ? "" : Number(raw));
            }}
            className="h-10 w-full min-w-0 bg-transparent text-center text-sm text-[var(--color-text)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            {...props}
          />
          <button
            type="button"
            className={cn(stepperClass, "rounded-r-[var(--radius-md)] border-l border-[var(--color-line)]")}
            onClick={() => adjust(step)}
            disabled={disabled || (max !== undefined && current !== null && current >= max)}
            aria-label={incrementLabel}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {hasError ? (
          <FieldMessage tone="error" id={`${inputId}-error`}>
            {error}
          </FieldMessage>
        ) : helperText ? (
          <FieldMessage id={`${inputId}-helper`}>{helperText}</FieldMessage>
        ) : null}
      </div>
    );
  },
);

NumberField.displayName = "NumberField";
