"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const variantStyles: Record<ToastVariant, string> = {
  success: "border-l-4 border-l-[var(--color-success)]",
  error: "border-l-4 border-l-[var(--color-danger)]",
  warning: "border-l-4 border-l-[var(--color-warning)]",
  info: "border-l-4 border-l-[var(--color-primary)]",
};

const variantIcons: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />,
  error: <AlertCircle className="h-5 w-5 text-[var(--color-danger)]" />,
  warning: <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />,
  info: <Info className="h-5 w-5 text-[var(--color-primary)]" />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((opts: Omit<ToastItem, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...opts, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext value={{ toast }}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((t) => (
          <ToastPrimitive.Root
            key={t.id}
            className={cn(
              "group pointer-events-auto relative flex items-start gap-3 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-4 shadow-level-2",
              "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
              "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
              "data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom-full",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
              variantStyles[t.variant],
            )}
            onOpenChange={(open) => {
              if (!open) removeToast(t.id);
            }}
          >
            {variantIcons[t.variant]}
            <div className="flex-1">
              <ToastPrimitive.Title className="text-sm font-medium text-[var(--color-text)]">
                {t.title}
              </ToastPrimitive.Title>
              {t.description && (
                <ToastPrimitive.Description className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
            <ToastPrimitive.Close
              className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport
          className={cn(
            "fixed z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4",
            "max-sm:bottom-0 max-sm:left-1/2 max-sm:max-w-[420px] max-sm:-translate-x-1/2",
            "sm:right-0 sm:bottom-0 sm:max-w-[420px]",
          )}
        />
      </ToastPrimitive.Provider>
    </ToastContext>
  );
}
