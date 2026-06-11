import Link from "next/link";
import type { ReactNode } from "react";
import { CheckIcon } from "../icons";

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
  const highlight = variant === "primary";
  return (
    <div
      className="lp-panel relative flex flex-col"
      style={{
        padding: "32px 30px 30px",
        borderColor: highlight ? "var(--ikat)" : "var(--rule)",
        boxShadow: highlight ? "var(--shadow-level-2)" : "var(--shadow-level-1)",
      }}
    >
      <div className="mb-3 flex items-center gap-3">
        <span
          className="mono"
          style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: highlight ? "var(--ikat)" : "var(--ink-3)" }}
        >
          {tag}
        </span>
        {tagBadge && (
          <span
            className="mono"
            style={{
              fontSize: 9,
              letterSpacing: "0.12em",
              padding: "3px 8px",
              borderRadius: 999,
              background: highlight ? "var(--ikat-tint)" : "var(--paper-strong)",
              color: highlight ? "var(--ikat-on-tint)" : "var(--ink-3)",
            }}
          >
            {tagBadge}
          </span>
        )}
      </div>

      <div style={{ fontSize: "clamp(28px, 2.4vw + 12px, 36px)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.05 }}>
        {name}
      </div>
      <div className="mt-1.5 text-[15px]" style={{ color: "var(--ink-3)" }}>
        {tagline}
      </div>

      <div className="mt-6 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-b pb-5" style={{ borderColor: "var(--rule)" }}>
        <span className="mono" style={{ fontSize: "clamp(40px, 4vw + 12px, 56px)", fontWeight: 700, letterSpacing: "-0.04em", lineHeight: 0.95, color: "var(--ink)" }}>
          {priceLine}
        </span>
        <span className="mono" style={{ fontSize: 12, letterSpacing: "0.1em", color: "var(--ink-3)", marginBottom: 6 }}>
          {unit}
        </span>
        {priceSub && (
          <span className="mono w-full pt-1" style={{ fontSize: 11, letterSpacing: "0.04em", color: "var(--ink-4)" }}>
            {priceSub}
          </span>
        )}
      </div>

      <ul className="m-0 mt-5 flex list-none flex-col gap-3 p-0 text-[14.5px] leading-[1.5]">
        {features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <span className="mt-0.5 shrink-0">
              <CheckIcon size={15} color={highlight ? "var(--ikat)" : "var(--leaf)"} />
            </span>
            <span style={{ color: "var(--ink-2)" }}>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {ctaSlot}
        {note && (
          <div className="mt-3.5 text-center text-[12.5px]" style={{ color: "var(--ink-3)" }}>
            {note}
          </div>
        )}
      </div>
    </div>
  );
}

export function PlanCtaLink({ href, label, isPrimary }: { href: string; label: string; isPrimary: boolean }) {
  return (
    <Link href={href} className={isPrimary ? "btn-primary w-full" : "btn-ghost w-full"}>
      {label}
    </Link>
  );
}
