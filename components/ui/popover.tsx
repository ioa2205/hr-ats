"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";

interface PopoverContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  contentId: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

function usePopover() {
  const ctx = useContext(PopoverContext);
  if (!ctx) throw new Error("Popover subcomponents must be used within <Popover>");
  return ctx;
}

export function Popover({
  children,
  open: controlledOpen,
  onOpenChange,
}: {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolled;
  const contentId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolled(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange],
  );

  return (
    <PopoverContext.Provider value={{ open, setOpen, contentId, triggerRef, contentRef }}>
      <span className="relative inline-flex">{children}</span>
    </PopoverContext.Provider>
  );
}

export function PopoverTrigger({
  children,
  asChild,
  className,
}: {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  const { open, setOpen, contentId, triggerRef } = usePopover();
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={triggerRef as React.Ref<HTMLButtonElement>}
      type={asChild ? undefined : "button"}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      data-state={open ? "open" : "closed"}
      className={className}
      onClick={() => setOpen(!open)}
    >
      {children}
    </Comp>
  );
}

export function PopoverContent({
  children,
  className,
  align = "start",
  side = "bottom",
  sideOffset = 6,
  ...aria
}: {
  children: ReactNode;
  className?: string;
  align?: "start" | "end" | "center";
  side?: "bottom" | "top";
  sideOffset?: number;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  const { open, setOpen, contentId, triggerRef, contentRef } = usePopover();

  // Close on outside pointer + Escape; restore focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    // Move focus into the panel for keyboard users.
    const first = contentRef.current?.querySelector<HTMLElement>(
      'input,select,textarea,button,[href],[tabindex]:not([tabindex="-1"])',
    );
    (first ?? contentRef.current)?.focus();
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen, triggerRef, contentRef]);

  if (!open) return null;

  return (
    <div
      ref={contentRef}
      id={contentId}
      role="dialog"
      tabIndex={-1}
      aria-label={aria["aria-label"]}
      aria-labelledby={aria["aria-labelledby"]}
      style={{ [side === "bottom" ? "top" : "bottom"]: `calc(100% + ${sideOffset}px)` }}
      className={cn(
        "glass-panel absolute z-50 min-w-[12rem] rounded-[var(--radius-lg)] border border-[var(--color-line)] p-3 text-[var(--color-text)] shadow-level-2 outline-none",
        "animate-in fade-in-0 zoom-in-95 motion-reduce:animate-none",
        align === "start" && "left-0",
        align === "end" && "right-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        className,
      )}
    >
      {children}
    </div>
  );
}
