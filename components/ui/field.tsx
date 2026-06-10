"use client";

import { forwardRef, type HTMLAttributes, type LabelHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Renders a non-color "required" marker. */
  required?: boolean;
  optionalText?: string;
}

export const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, optionalText, ...props }, ref) => (
    <label
      ref={ref}
      className={cn(
        "flex items-center gap-1 text-sm font-medium text-[var(--color-text)]",
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-[var(--color-danger)]" aria-hidden="true">
          *
        </span>
      )}
      {!required && optionalText && (
        <span className="text-xs font-normal text-[var(--color-text-subtle)]">{optionalText}</span>
      )}
    </label>
  ),
);
Label.displayName = "Label";

export interface FieldMessageProps extends HTMLAttributes<HTMLParagraphElement> {
  tone?: "muted" | "error";
}

export const FieldMessage = forwardRef<HTMLParagraphElement, FieldMessageProps>(
  ({ className, tone = "muted", children, ...props }, ref) => (
    <p
      ref={ref}
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "text-xs",
        tone === "error" ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  ),
);
FieldMessage.displayName = "FieldMessage";

/**
 * Vertical field group: label, control, and a single helper/error line.
 * Use when composing custom inputs that the Input/Textarea/Select wrappers
 * don't cover (e.g. a control made of multiple elements).
 */
export function Field({
  label,
  htmlFor,
  required,
  optionalText,
  helperText,
  error,
  children,
  className,
  hint,
}: {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  optionalText?: string;
  helperText?: string;
  error?: string;
  children: ReactNode;
  className?: string;
  /** Extra trailing content on the label row (e.g. a character counter). */
  hint?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {(label || hint) && (
        <div className="flex items-center justify-between gap-2">
          {label && (
            <Label htmlFor={htmlFor} required={required} optionalText={optionalText}>
              {label}
            </Label>
          )}
          {hint}
        </div>
      )}
      {children}
      {error ? (
        <FieldMessage tone="error">{error}</FieldMessage>
      ) : helperText ? (
        <FieldMessage>{helperText}</FieldMessage>
      ) : null}
    </div>
  );
}
