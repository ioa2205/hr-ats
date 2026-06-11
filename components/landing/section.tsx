import type { ReactNode } from "react";

/**
 * Shared marketing section header. Quiet mono eyebrow with a Tez Lapis signal
 * dot, an optional right-aligned meta label, and a strong Manrope heading. No
 * editorial serif, no decorative rule bars.
 */
export function SectionHeader({
  eyebrow,
  meta,
  accent = false,
  children,
  maxWidth = 900,
}: {
  eyebrow: string;
  meta?: string;
  accent?: boolean;
  children: ReactNode;
  maxWidth?: number;
}) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <span className={`lp-eyebrow${accent ? " is-accent" : ""}`}>{eyebrow}</span>
        {meta && (
          <span className="mono" style={{ fontSize: 11, letterSpacing: "0.12em", color: "var(--ink-4)" }}>
            {meta}
          </span>
        )}
      </div>
      <h2 className="lp-h2" style={{ margin: 0, maxWidth }}>
        {children}
      </h2>
    </div>
  );
}
