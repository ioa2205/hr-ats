import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthBannerProps {
  tone?: "error" | "info" | "success";
  children: ReactNode;
  icon?: ReactNode;
}

const toneClass: Record<NonNullable<AuthBannerProps["tone"]>, string> = {
  error:
    "border-[color-mix(in_srgb,var(--color-danger)_35%,transparent)] bg-[var(--color-danger-container)] text-[var(--color-on-danger-container)]",
  info: "border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-[var(--color-text)]",
  success:
    "border-[color-mix(in_srgb,var(--color-success)_35%,transparent)] bg-[var(--color-success-container)] text-[var(--color-on-success-container)]",
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
        "flex items-start gap-2.5 rounded-[var(--radius-sm)] border px-3.5 py-2.5 text-[13px] leading-[1.5]",
        toneClass[tone],
      )}
    >
      {icon && <span className="mt-[1px] shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1 font-medium">{children}</span>
    </div>
  );
}

export function AuthDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--color-line)]" aria-hidden />
      <span className="data-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[var(--color-line)]" aria-hidden />
    </div>
  );
}
