import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface KpiCellData {
  label: ReactNode;
  value: ReactNode;
  delta?: ReactNode;
  deltaTone?: "up" | "down" | "flat";
  valueAccent?: "persimmon" | "ink";
}

export function KpiBar({ cells }: { cells: KpiCellData[] }) {
  return (
    <div className="border-rule bg-paper shadow-tez-1 mt-4 grid overflow-hidden rounded-md border grid-cols-2 md:grid-cols-4">
      {cells.map((c, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col gap-1 px-4 py-3",
            i > 0 && "border-rule md:border-l",
            i > 0 && i % 2 === 0 && "border-rule md:border-l border-t md:border-t-0",
            i === 1 && "border-t-0",
          )}
        >
          <span className="text-ink-4 text-[11px] font-medium tracking-[-0.005em]">{c.label}</span>
          <span
            className="font-sans text-[22px] font-semibold leading-none tracking-[-0.02em]"
            style={{
              color:
                c.valueAccent === "persimmon" ? "var(--color-persimmon)" : "var(--color-ink)",
              fontVariantNumeric: "tabular-nums",
              display: "inline-flex",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            {c.value}
            {c.delta && (
              <span
                className={cn(
                  "text-[10.5px] font-medium",
                  c.deltaTone === "down"
                    ? "text-[var(--color-tez-red)]"
                    : c.deltaTone === "flat"
                      ? "text-ink-5"
                      : "text-[var(--color-tez-green)]",
                )}
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {c.delta}
              </span>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
