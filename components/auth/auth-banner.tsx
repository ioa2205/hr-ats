import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AuthBannerProps {
  tone?: "error" | "info" | "success";
  children: ReactNode;
  icon?: ReactNode;
}

export function AuthBanner({ tone = "error", children, icon }: AuthBannerProps) {
  const toneClass =
    tone === "success"
      ? "border-ink-6 bg-bone-2 text-ink-2"
      : tone === "info"
        ? "border-rule-2 bg-bone-2 text-ink-2"
        : "border-persimmon bg-persimmon-tint text-persimmon-2";
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex items-start gap-2.5 rounded-[6px] border px-3.5 py-2.5 text-[13px] leading-[1.5]",
        toneClass,
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
      <span className="bg-rule h-px flex-1" aria-hidden />
      <span
        className="text-ink-5 text-[10.5px] font-semibold uppercase tracking-[0.12em]"
        style={{ fontFamily: "var(--font-tez-mono)" }}
      >
        {label}
      </span>
      <span className="bg-rule h-px flex-1" aria-hidden />
    </div>
  );
}
