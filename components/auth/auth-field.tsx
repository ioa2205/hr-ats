"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  label: string;
  helper?: string;
  error?: string;
  endSlot?: ReactNode;
}

export const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  ({ label, helper, error, endSlot, className, id, name, ...rest }, ref) => {
    const fieldId = id ?? `f-${(name ?? label).toLowerCase().replace(/\s+/g, "-")}`;
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label
            htmlFor={fieldId}
            className="text-ink text-[13px] font-semibold tracking-[-0.005em]"
          >
            {label}
          </label>
          {endSlot}
        </div>
        <input
          ref={ref}
          id={fieldId}
          name={name}
          {...rest}
          className={cn(
            "border-rule bg-paper text-ink placeholder:text-ink-5 flex h-[44px] w-full items-center rounded-[6px] border px-3.5 text-[14.5px] transition-colors",
            "focus:border-ink focus:outline-none",
            rest.readOnly && "bg-bone-2/60 text-ink-3 cursor-default",
            error && "border-persimmon focus:border-persimmon",
            className,
          )}
        />
        {error ? (
          <p className="text-persimmon text-[12.5px]" role="alert">
            {error}
          </p>
        ) : helper ? (
          <p className="text-ink-4 text-[12.5px]">{helper}</p>
        ) : null}
      </div>
    );
  },
);
AuthField.displayName = "AuthField";
