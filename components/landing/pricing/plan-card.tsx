import Link from "next/link";
import type { ReactNode } from "react";

export interface PlanCardProps {
  tag: string;
  tagBadge?: string;
  name: string;
  tagline: string;
  priceLine: string;
  priceSub?: string;
  unit: string;
  features: string[];
  note?: string;
  variant: "primary" | "secondary";
  ctaSlot: ReactNode;
}

export function PlanCard({
  tag,
  tagBadge,
  name,
  tagline,
  priceLine,
  priceSub,
  unit,
  features,
  note,
  variant,
  ctaSlot,
}: PlanCardProps) {
  const isPrimary = variant === "primary";
  return (
    <div
      className="relative"
      style={{
        padding: "36px 36px 32px",
        background: isPrimary ? "var(--ink)" : "var(--paper-3)",
        color: isPrimary ? "var(--paper-3)" : "var(--ink)",
        border: "1.5px solid var(--ink)",
        boxShadow: isPrimary ? "10px 10px 0 var(--persimmon)" : "10px 10px 0 var(--ink)",
      }}
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className="mono text-[11px] tracking-[0.2em]"
          style={{ color: isPrimary ? "var(--saffron)" : "var(--persimmon-2)" }}
        >
          {tag}
        </span>
        {tagBadge && (
          <span
            className="mono text-[9px] tracking-[0.18em]"
            style={{
              padding: "2px 8px",
              background: isPrimary ? "var(--saffron)" : "var(--ink)",
              color: isPrimary ? "var(--ink)" : "var(--paper-3)",
            }}
          >
            {tagBadge}
          </span>
        )}
      </div>
      <div
        className="serif leading-none tracking-[-0.03em]"
        style={{ fontSize: "clamp(32px, 3vw + 12px, 44px)" }}
      >
        {name}
      </div>
      <div
        className="serif mt-2 text-[16px] italic"
        style={{ color: isPrimary ? "#C8C0B0" : "var(--ink-3)" }}
      >
        — {tagline}
      </div>
      <div
        className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b pb-5"
        style={{
          borderColor: isPrimary ? "rgba(247,242,230,0.22)" : "var(--ink)",
        }}
      >
        <span
          className="serif leading-[0.9] tracking-[-0.05em]"
          style={{
            fontSize: "clamp(56px, 6vw + 16px, 92px)",
            color: isPrimary ? "var(--paper-3)" : "var(--ink)",
          }}
        >
          {priceLine}
        </span>
        <span
          className="mono text-[11px] tracking-[0.16em]"
          style={{
            color: isPrimary ? "#C8C0B0" : "var(--ink-3)",
            marginBottom: 8,
          }}
        >
          {unit}
        </span>
        {priceSub && (
          <span
            className="mono w-full pt-1 text-[11px] tracking-[0.1em]"
            style={{ color: isPrimary ? "#9A9485" : "var(--ink-4)" }}
          >
            {priceSub}
          </span>
        )}
      </div>
      <ul
        className="m-0 mt-5 flex list-none flex-col gap-2.5 p-0 text-[14px] leading-[1.5]"
      >
        {features.map((f, i) => (
          <li key={f} className="flex gap-3">
            <span
              className="serif italic"
              style={{
                color: isPrimary ? "var(--saffron)" : "var(--persimmon-2)",
                fontSize: 16,
                width: 22,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        {ctaSlot}
        {note && (
          <div
            className="serif mt-3.5 text-center text-[12px] italic"
            style={{ color: isPrimary ? "#C8C0B0" : "var(--ink-3)" }}
          >
            {note}
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanCtaLink({
  href,
  label,
  isPrimary,
}: {
  href: string;
  label: string;
  isPrimary: boolean;
}) {
  return (
    <Link
      href={href}
      className="block w-full text-center"
      style={{
        padding: "14px 18px",
        background: isPrimary ? "var(--persimmon)" : "var(--ink)",
        color: "var(--paper-3)",
        fontFamily: "var(--font-manrope),sans-serif",
        fontWeight: 600,
        fontSize: 14,
        letterSpacing: "-0.005em",
        textDecoration: "none",
      }}
    >
      {label}
    </Link>
  );
}
