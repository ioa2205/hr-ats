import { cn } from "@/lib/utils";

export type SkeletonVariant = "text" | "rect" | "circle";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ variant = "text", className, width, height }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-[var(--color-surface-strong)] motion-reduce:animate-none",
        variant === "text" && "h-[1em] w-full rounded-[var(--radius-sm)]",
        variant === "rect" && "rounded-[var(--radius-md)]",
        variant === "circle" && "rounded-full",
        className,
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
