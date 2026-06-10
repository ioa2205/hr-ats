"use client";

import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: ReactNode;
  description?: ReactNode;
  indeterminate?: boolean;
}

/**
 * Checkbox built on a native input (free keyboard + form semantics). The label
 * row is a 44px tap target on touch while the box stays compact for dense UIs.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, indeterminate, id, disabled, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const innerRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (innerRef.current) innerRef.current.indeterminate = Boolean(indeterminate);
    }, [indeterminate]);

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "flex min-h-11 cursor-pointer items-start gap-3 select-none sm:min-h-0",
          disabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        <span className="relative flex items-center pt-0.5">
          <input
            ref={(node) => {
              innerRef.current = node;
              if (typeof ref === "function") ref(node);
              else if (ref) ref.current = node;
            }}
            id={inputId}
            type="checkbox"
            disabled={disabled}
            className={cn(
              "peer h-5 w-5 shrink-0 appearance-none rounded-[var(--radius-sm)] border border-[var(--color-line-strong)] bg-[var(--color-surface)]",
              "transition-colors duration-150",
              "checked:border-[var(--color-primary)] checked:bg-[var(--color-primary)]",
              "indeterminate:border-[var(--color-primary)] indeterminate:bg-[var(--color-primary)]",
              "disabled:cursor-not-allowed",
            )}
            {...props}
          />
          <Check
            className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 text-[var(--color-on-primary)] opacity-0 peer-checked:opacity-100 peer-indeterminate:opacity-0"
            aria-hidden="true"
            strokeWidth={3}
          />
          <Minus
            className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 text-[var(--color-on-primary)] opacity-0 peer-indeterminate:opacity-100"
            aria-hidden="true"
            strokeWidth={3}
          />
        </span>
        {(label || description) && (
          <span className="flex flex-col gap-0.5">
            {label && <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>}
            {description && (
              <span className="text-xs text-[var(--color-text-muted)]">{description}</span>
            )}
          </span>
        )}
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";
