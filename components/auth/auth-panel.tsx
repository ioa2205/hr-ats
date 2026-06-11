import type { ReactNode } from "react";

interface AuthPanelProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * TezHR auth card — the calm, low-anxiety surface shared by every /auth and
 * /onboarding screen. Semantic tokens only: a 12px content surface with a
 * mono eyebrow, an `h1` title, and a muted subtitle.
 */
export function AuthPanel({ eyebrow, title, subtitle, children, footer }: AuthPanelProps) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] shadow-level-1">
      <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-1.5">
          {eyebrow && (
            <span className="data-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]">
              {eyebrow}
            </span>
          )}
          <h1 className="text-[24px] font-bold leading-[1.18] tracking-[-0.02em] text-[var(--color-text)] sm:text-[26px]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[14px] leading-[1.55] text-[var(--color-text-muted)]">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
      {footer && (
        <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-5 py-3 sm:px-7">
          {footer}
        </div>
      )}
    </div>
  );
}
