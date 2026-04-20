"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";
import { useTranslation } from "@/lib/i18n/provider";

export type ButtonVariant = "primary" | "secondary" | "tonal" | "ghost" | "danger" | "link";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  asChild?: boolean;
}

export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover hover:shadow-level-1 active:shadow-none",
  secondary:
    "border border-outline text-on-surface hover:bg-surface-container active:bg-surface-container-high",
  tonal: "bg-primary-container text-on-primary-container hover:shadow-level-1 active:shadow-none",
  ghost: "text-on-surface hover:bg-surface-container active:bg-surface-container-high",
  danger: "bg-danger text-on-primary hover:bg-danger/90 hover:shadow-level-1 active:shadow-none",
  link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
};

export const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-[var(--radius-sm)]",
  md: "h-10 px-4 text-sm gap-2 rounded-[var(--radius-md)]",
  lg: "h-12 px-6 text-base gap-2.5 rounded-[var(--radius-md)]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const { t } = useTranslation();
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200",
          "ease-[var(--ease-standard)] select-none",
          "disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant],
          variant !== "link" && buttonSizes[size],
          className,
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Spinner size="sm" label={t("common.loading")} />
            <span className="sr-only">{t("common.loading")}</span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);

Button.displayName = "Button";
