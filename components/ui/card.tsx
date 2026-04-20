import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, hoverable, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "border-outline-variant bg-surface rounded-[var(--radius-lg)] border",
        hoverable &&
          "hover:shadow-level-1 transition-shadow duration-200 ease-[var(--ease-standard)]",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col gap-1.5 p-6 pb-0", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-on-surface text-lg font-semibold", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn("text-on-surface-variant text-sm", className)} {...props} />
));
CardDescription.displayName = "CardDescription";

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6", className)} {...props} />,
);
CardContent.displayName = "CardContent";

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center gap-2 px-6 pt-0 pb-6", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";
