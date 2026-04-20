import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "accent" | "ink";
type Size = "sm" | "md" | "lg" | "icon";

interface TezButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

const base =
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-[4px] border font-medium leading-none tracking-[-0.005em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper border-ink shadow-tez-1 hover:bg-ink-2",
  accent: "bg-persimmon text-white border-persimmon shadow-tez-1 hover:bg-persimmon-2",
  secondary:
    "bg-paper text-ink-2 border-rule-2 shadow-tez-1 hover:bg-bone hover:border-ink-6",
  ghost: "bg-transparent text-ink-3 border-transparent hover:bg-bone-2 hover:text-ink",
  ink: "bg-ink text-paper border-ink hover:bg-ink-2",
};

const sizes: Record<Size, string> = {
  sm: "h-6 px-2 text-[11.5px] gap-1",
  md: "h-[30px] px-[11px] text-[12.5px]",
  lg: "h-[34px] px-3.5 text-[13px]",
  icon: "h-[30px] w-[30px] justify-center px-0",
};

export function TezButton({
  variant = "secondary",
  size = "md",
  leadingIcon,
  trailingIcon,
  children,
  className,
  ...rest
}: TezButtonProps) {
  return (
    <button
      {...rest}
      className={cn(base, variants[variant], sizes[size], className)}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
