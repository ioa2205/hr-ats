import type { ReactNode } from "react";

interface AuthPanelProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Shared editorial heading and form rhythm for account and onboarding screens.
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
          <h1 className="text-[32px] leading-[1.12] font-extrabold tracking-[-0.04em] [overflow-wrap:anywhere] text-[var(--color-text)] sm:text-[40px]">
            {title}
          </h1>
          {subtitle && (
            <p className="max-w-[48ch] text-[15px] leading-[1.6] [overflow-wrap:anywhere] text-[var(--color-text-muted)] sm:text-[16px]">
              {subtitle}
            </p>
          )}
        </div>
        {children}
      </div>
      {footer && <div className="mt-6">{footer}</div>}
    </section>
  );
}
