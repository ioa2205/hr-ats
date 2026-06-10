"use client";

import { forwardRef, useId, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onChange" | "type"> {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
}

/**
 * Switch for instant on/off settings. Built as a `role="switch"` button so
 * Space/Enter toggle it natively. Works controlled (`checked`) or uncontrolled
 * (`defaultChecked`).
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked,
      defaultChecked,
      onCheckedChange,
      label,
      description,
      disabled,
      id,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const switchId = id ?? generatedId;
    const labelId = label ? `${switchId}-label` : undefined;
    const isControlled = checked !== undefined;
    const [internal, setInternal] = useState(defaultChecked ?? false);
    const isOn = isControlled ? checked : internal;

    const control = (
      <button
        ref={ref}
        id={switchId}
        type="button"
        role="switch"
        aria-checked={isOn}
        aria-labelledby={labelId}
        disabled={disabled}
        data-state={isOn ? "checked" : "unchecked"}
        onClick={() => {
          if (!isControlled) setInternal((v) => !v);
          onCheckedChange?.(!isOn);
        }}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-[var(--radius-full)] border border-transparent transition-colors duration-150 ease-[var(--ease-standard)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "data-[state=checked]:bg-[var(--color-primary)] data-[state=unchecked]:bg-[var(--color-line-strong)]",
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none ml-0.5 block h-5 w-5 rounded-full bg-[var(--color-surface)] shadow-level-1 transition-transform duration-150 ease-[var(--ease-standard)]",
            isOn ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    );

    if (!label && !description) return control;

    return (
      <div className="flex items-start gap-3">
        {control}
        <label htmlFor={switchId} id={labelId} className="flex cursor-pointer flex-col gap-0.5">
          {label && <span className="text-sm font-medium text-[var(--color-text)]">{label}</span>}
          {description && (
            <span className="text-xs text-[var(--color-text-muted)]">{description}</span>
          )}
        </label>
      </div>
    );
  },
);

Switch.displayName = "Switch";
