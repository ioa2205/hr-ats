"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";
import { useTranslation } from "@/lib/i18n/provider";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tonal"
  | "ghost"
  | "danger"
  | "accent"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  /** Stretch to the full width of the parent (useful for mobile sticky actions). */
  fullWidth?: boolean;
  asChild?: boolean;
}

/**
 * Unified TezHR button. Uses semantic role tokens only. Hover deltas are
 * theme-correct: solid surfaces mix toward the ink role so they darken in
 * light mode and lighten in dark mode.
 */
export const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)] active:bg-[var(--color-primary-hover)] hover:shadow-level-1 active:shadow-none",
  secondary:
    "border border-[var(--color-line-strong)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] active:bg-[var(--color-surface-strong)]",
  tonal:
    "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)] hover:shadow-level-1 active:shadow-none",
  ghost:
    "text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)] active:bg-[var(--color-surface-strong)]",
  danger:
    "bg-[var(--color-danger)] text-[var(--color-on-danger)] hover:bg-[color-mix(in_srgb,var(--color-danger)_92%,var(--color-text))] hover:shadow-level-1 active:shadow-none",
  accent:
    "bg-[var(--color-accent)] text-[var(--color-on-accent)] hover:bg-[color-mix(in_srgb,var(--color-accent)_92%,var(--color-text))] hover:shadow-level-1 active:shadow-none",
  link: "text-[var(--color-primary)] underline-offset-4 hover:underline p-0 h-auto",
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
      fullWidth = false,
      disabled,
      asChild = false,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const { t } = useTranslation();
    const showSpinner = loading && !asChild;
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "ease-[var(--ease-standard)] select-none",
          "disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant],
          variant !== "link" && buttonSizes[size],
          fullWidth && "w-full",
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {showSpinner ? (
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
