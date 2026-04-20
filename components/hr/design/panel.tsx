import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "border-rule bg-paper shadow-tez-1 overflow-hidden rounded-md border",
        className,
      )}
      style={{ borderRadius: 6 }}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "border-rule flex items-center justify-between gap-4 border-b px-3.5 py-[11px]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function PanelTitle({
  count,
  children,
}: {
  count?: number | string | null;
  children: ReactNode;
}) {
  return (
    <div className="text-ink flex items-center gap-2 text-[12.5px] font-semibold tracking-[-0.005em]">
      {children}
      {count != null && (
        <span
          className="border-rule bg-bone text-ink-4 text-mono rounded-[3px] border px-1.5 py-[1px] text-[10px]"
          style={{ fontFamily: "var(--font-tez-mono)" }}
        >
          {count}
        </span>
      )}
    </div>
  );
}

export function PanelAction({
  onClick,
  children,
  "aria-label": ariaLabel,
}: {
  onClick?: () => void;
  children: ReactNode;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="text-ink-4 hover:bg-bone-2 hover:text-ink flex items-center gap-1.5 rounded-[4px] border-none bg-transparent px-1.5 py-1 text-[11.5px] transition-colors"
    >
      {children}
    </button>
  );
}

export function SectionH({
  title,
  right,
}: {
  title: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between">
      <div className="text-ink-4 flex items-center gap-1.5 text-[11px] font-semibold">
        {title}
      </div>
      {right}
    </div>
  );
}
