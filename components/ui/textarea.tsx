"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";
import { FieldMessage, Label } from "./field";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  autoGrow?: boolean;
  maxCharacters?: number;
  currentLength?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, helperText, error, autoGrow, maxCharacters, currentLength, id, onChange, ...props },
    ref,
  ) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const hasError = Boolean(error);
    const describedBy = hasError
      ? `${textareaId}-error`
      : helperText
        ? `${textareaId}-helper`
        : undefined;

    useEffect(() => {
      if (autoGrow && internalRef.current) {
        const el = internalRef.current;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }
    }, [autoGrow, props.value]);

    return (
      <div className="flex flex-col gap-1.5">
        {label && <Label htmlFor={textareaId}>{label}</Label>}
        <textarea
          ref={(node) => {
            internalRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          id={textareaId}
          className={cn(
            "w-full rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]",
            "placeholder:text-[var(--color-text-subtle)] outline-none",
            "transition-colors duration-150 ease-[var(--ease-standard)]",
            "disabled:cursor-not-allowed disabled:opacity-60",
            hasError
              ? "border-[var(--color-danger)]"
              : "border-[var(--color-line-strong)] focus:border-[var(--color-focus)]",
            autoGrow ? "resize-none overflow-hidden" : "min-h-[80px] resize-y",
            className,
          )}
          aria-invalid={hasError || undefined}
          aria-describedby={describedBy}
          onChange={(e) => {
            if (autoGrow) {
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }
            onChange?.(e);
          }}
          {...props}
        />
        {(hasError || helperText || maxCharacters !== undefined) && (
          <div className="flex items-center justify-between gap-2">
            {hasError ? (
              <FieldMessage tone="error" id={`${textareaId}-error`}>
                {error}
              </FieldMessage>
            ) : helperText ? (
              <FieldMessage id={`${textareaId}-helper`}>{helperText}</FieldMessage>
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

Textarea.displayName = "Textarea";
