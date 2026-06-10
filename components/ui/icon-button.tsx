"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";
import { buttonVariants, type ButtonVariant } from "./button";

export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: IconButtonSize;
  loading?: boolean;
  asChild?: boolean;
  /**
   * Accessible name for the icon-only control. Required — an icon button with
   * no label is invisible to screen readers and fails the accessibility contract.
   */
  "aria-label": string;
}

/**
 * Square icon-only button. `lg` is a 44px touch target for important mobile
 * actions; `sm`/`md` are dense desktop sizes that keep adequate spacing.
 */
const iconSizes: Record<IconButtonSize, string> = {
  sm: "h-8 w-8 rounded-[var(--radius-sm)] [&_svg]:size-4",
  md: "h-9 w-9 rounded-[var(--radius-md)] [&_svg]:size-[18px]",
  lg: "h-11 w-11 rounded-[var(--radius-md)] [&_svg]:size-5",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, variant = "ghost", size = "md", loading = false, disabled, asChild = false, children, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex shrink-0 items-center justify-center font-medium transition-all duration-150",
          "ease-[var(--ease-standard)] select-none",
          "disabled:pointer-events-none disabled:opacity-50",
          buttonVariants[variant],
          iconSizes[size],
          className,
        )}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && !asChild ? <Spinner size="sm" label={props["aria-label"]} /> : children}
      </Comp>
    );
  },
);

IconButton.displayName = "IconButton";
