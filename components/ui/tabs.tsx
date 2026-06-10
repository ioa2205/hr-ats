"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn("flex border-b border-[var(--color-line)]", className)}
    {...props}
  />
));
TabsList.displayName = "TabsList";

export const TabsTrigger = forwardRef<
  HTMLButtonElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative inline-flex min-h-11 items-center justify-center px-4 py-2.5 text-sm font-medium text-[var(--color-text-muted)]",
      "transition-colors duration-150 ease-[var(--ease-standard)]",
      "hover:text-[var(--color-text)]",
      "disabled:pointer-events-none disabled:opacity-50",
      "data-[state=active]:text-[var(--color-primary)]",
      "after:absolute after:right-0 after:bottom-0 after:left-0 after:h-0.5",
      "after:origin-center after:scale-x-0 after:bg-[var(--color-primary)]",
      "after:transition-transform after:duration-200 after:ease-[var(--ease-emphasized)] motion-reduce:after:transition-none",
      "data-[state=active]:after:scale-x-100",
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = "TabsTrigger";

export const TabsContent = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content ref={ref} className={cn("mt-4 outline-none", className)} {...props} />
));
TabsContent.displayName = "TabsContent";
