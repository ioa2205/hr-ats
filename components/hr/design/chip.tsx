"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Chip({
  active = false,
  count,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  count?: number | null;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-[4px] border px-2.5 text-[11.5px] font-medium shadow-tez-1 transition-colors",
        active
          ? "bg-ink text-paper border-ink"
          : "bg-paper text-ink-3 border-rule-2 hover:bg-bone-2",
        className,
      )}
    >
      {children}
      {count != null && (
        <span
          className={cn("text-[10px]", active ? "text-bone-3" : "text-ink-5")}
          style={{ fontFamily: "var(--font-tez-mono)" }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-bone border-rule-2 shadow-tez-1 inline-flex h-[26px] items-center rounded-[4px] border p-[1px]",
        className,
      )}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            title={o.title}
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1 rounded-[3px] px-2.5 text-[11px] font-medium transition-colors",
              on ? "bg-paper text-ink shadow-tez-1" : "text-ink-4 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
