import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthBannerProps {
  tone?: "error" | "info" | "success";
  children: ReactNode;
  icon?: ReactNode;
}

const toneClass: Record<NonNullable<AuthBannerProps["tone"]>, string> = {
  error: "bg-[var(--color-danger-container)] text-[var(--color-on-danger-container)]",
  info: "bg-[var(--color-surface-subtle)] text-[var(--color-text)]",
  success: "bg-[var(--color-success-container)] text-[var(--color-on-success-container)]",
};

/**
 * Inline feedback callout for the auth forms. Status is conveyed by icon + text,
 * never color alone; errors are announced assertively.
 */
export function AuthBanner({ tone = "error", children, icon }: AuthBannerProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-[12px] px-4 py-3 text-[13px] leading-[1.5]",
        toneClass[tone],
      )}
    >
      {icon && <span className="mt-[1px] shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1 font-medium [overflow-wrap:anywhere]">{children}</span>
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <p className="text-center text-[13px] text-[var(--color-text-subtle)]">{label}</p>
  );
}
