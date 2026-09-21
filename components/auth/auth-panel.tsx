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
    <section className="account-panel">
      <div className="flex flex-col gap-7">
        <div className="flex flex-col gap-2">
          {eyebrow && (
            <span className="text-[11px] font-bold tracking-[0.12em] text-[var(--color-text-muted)] uppercase">
              {eyebrow}
            </span>
          )}
          <h1 className="text-[34px] leading-[1.08] font-extrabold tracking-[-0.04em] text-[var(--color-text)] sm:text-[40px]">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-[48ch] text-[15px] leading-[1.6] text-[var(--color-text-muted)] sm:text-[16px]">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
      {footer && <div className="mt-6 border-t border-[var(--color-line)] pt-4">{footer}</div>}
    </section>
  );
}
