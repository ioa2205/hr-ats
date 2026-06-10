import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface TezSignalMarkProps {
  size?: number;
  className?: string;
  title?: string;
}

interface TezSignalWordmarkProps {
  size?: number;
  className?: string;
  markClassName?: string;
  suffix?: string;
  domain?: boolean;
  monochrome?: boolean;
}

/**
 * Tez Signal: a compact T built from 45-degree tile geometry. The chamfered
 * top bar moves forward like a signal while the vertical stem stays legible
 * at favicon size.
 */
export function TezSignalMark({ size = 20, className, title }: TezSignalMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      fill="none"
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path d="M2 4h13.5L22 8l-6.5 4H13v8H7v-8H2l3-4-3-4Z" fill="currentColor" />
    </svg>
  );
}

export function TezSignalWordmark({
  size = 16,
  className,
  markClassName,
  suffix,
  domain = false,
  monochrome = false,
}: TezSignalWordmarkProps) {
  const style = { "--tez-wordmark-size": `${size}px` } as CSSProperties;

  return (
    <span
      className={cn(
        "inline-flex items-center leading-none font-[var(--font-sans)] font-bold tracking-[-0.035em] whitespace-nowrap text-[var(--color-text)]",
        className,
      )}
      style={style}
    >
      <TezSignalMark
        size={Math.max(16, Math.round(size * 1.08))}
        className={cn(
          "mr-[0.42em]",
          monochrome ? "text-current" : "text-[var(--color-primary)]",
          markClassName,
        )}
      />
      <span style={{ fontSize: "var(--tez-wordmark-size)" }}>TezHR</span>
      {domain && (
        <span
          className="ml-[0.16em] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)]"
          style={{ fontSize: "calc(var(--tez-wordmark-size) * 0.5)" }}
        >
          .uz
        </span>
      )}
      {suffix && (
        <>
          <span
            className="mx-[0.45em] font-normal text-[var(--color-text-subtle)]"
            aria-hidden="true"
            style={{ fontSize: "calc(var(--tez-wordmark-size) * 0.72)" }}
          >
            {"\u00b7"}
          </span>
          <span
            className="font-medium tracking-[-0.01em] text-[var(--color-text-muted)]"
            style={{ fontSize: "calc(var(--tez-wordmark-size) * 0.78)" }}
          >
            {suffix}
          </span>
        </>
      )}
    </span>
  );
}
