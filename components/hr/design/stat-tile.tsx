import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  delta,
  accent = "ink",
  className,
}: {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  accent?: "ink" | "persimmon" | "red";
  className?: string;
}) {
  const color =
    accent === "persimmon"
      ? "var(--color-persimmon)"
      : accent === "red"
        ? "var(--color-tez-red)"
        : "var(--color-ink)";
  return (
    <div
      className={cn(
        "border-rule bg-paper shadow-tez-1 flex flex-col gap-1 rounded-md border px-3.5 py-3",
        className,
      )}
      style={{ borderRadius: 6 }}
    >
      <span className="text-ink-4 text-[11px] font-medium">{label}</span>
      <span
        className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em]"
        style={{ color, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
      {delta && (
        <span
          className="text-ink-4 text-[10.5px]"
          style={{ fontFamily: "var(--font-tez-mono)" }}
        >
          {delta}
        </span>
      )}
    </div>
  );
}
