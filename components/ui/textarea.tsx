"use client";

import { forwardRef, useEffect, useRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  autoGrow?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, autoGrow, id, onChange, ...props }, ref) => {
    const internalRef = useRef<HTMLTextAreaElement | null>(null);
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    const hasError = Boolean(error);

    useEffect(() => {
      if (autoGrow && internalRef.current) {
        const el = internalRef.current;
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      }
    }, [autoGrow, props.value]);

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="text-on-surface text-sm font-medium">
            {label}
          </label>
        )}
        <textarea
          ref={(node) => {
            internalRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          id={textareaId}
          className={cn(
            "bg-surface text-on-surface w-full rounded-[var(--radius-md)] border px-3 py-2 text-sm outline-none",
            "placeholder:text-on-surface-variant/60",
            "transition-colors duration-200 ease-[var(--ease-standard)]",
            hasError ? "border-danger" : "border-outline-variant focus:border-primary",
            autoGrow ? "resize-none overflow-hidden" : "min-h-[80px] resize-y",
            className,
          )}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${textareaId}-error` : undefined}
          onChange={(e) => {
            if (autoGrow) {
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }
            onChange?.(e);
          }}
          {...props}
        />
        {hasError && (
          <p id={`${textareaId}-error`} className="text-danger text-xs" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";
