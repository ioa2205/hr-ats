"use client";

import {
  createContext,
  forwardRef,
  useContext,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface RadioGroupContextValue {
  name: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

export function RadioGroup({
  name,
  value,
  onValueChange,
  disabled,
  className,
  children,
  ...aria
}: RadioGroupProps) {
  const generatedName = useId();
  return (
    <RadioGroupContext.Provider
      value={{ name: name ?? generatedName, value, onValueChange, disabled }}
    >
      <div role="radiogroup" className={cn("flex flex-col gap-2", className)} {...aria}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "onChange"> {
  value: string;
  label?: ReactNode;
  description?: ReactNode;
}

/**
 * Radio built on a native input. Native same-name grouping gives free arrow-key
 * navigation. Use inside a `RadioGroup` for controlled value handling.
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, value, label, description, id, disabled, ...props }, ref) => {
    const group = useContext(RadioGroupContext);
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const isDisabled = disabled || group?.disabled;

    return (
      <label
        htmlFor={inputId}
        className={cn(
          "flex min-h-11 cursor-pointer items-start gap-3 select-none sm:min-h-0",
          isDisabled && "cursor-not-allowed opacity-60",
          className,
        )}
      >
        <span className="relative flex items-center pt-0.5">
          <input
            ref={ref}
            id={inputId}
            type="radio"
            value={value}
            name={group?.name}
            disabled={isDisabled}
            checked={group ? group.value === value : undefined}
            onChange={(e) => {
              if (e.target.checked) group?.onValueChange?.(value);
            }}
            className={cn(
              "peer h-5 w-5 shrink-0 appearance-none rounded-full border border-[var(--color-line-strong)] bg-[var(--color-surface)]",
              "transition-colors duration-150",
              "checked:border-[var(--color-primary)]",
              "disabled:cursor-not-allowed",
            )}
            {...props}
          />
          <span
            className="pointer-events-none absolute inset-0 m-auto h-2.5 w-2.5 rounded-full bg-[var(--color-primary)] opacity-0 transition-opacity peer-checked:opacity-100"
            aria-hidden="true"
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

Radio.displayName = "Radio";
