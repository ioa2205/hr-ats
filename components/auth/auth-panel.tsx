import type { ReactNode } from "react";

interface AuthPanelProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * TezHR-styled auth card. Consistent header with eyebrow + title + subtitle,
 * a padded body, and an optional muted footer strip.
 */
export function AuthPanel({ eyebrow, title, subtitle, children, footer }: AuthPanelProps) {
  return (
    <div className="border-rule bg-paper shadow-tez-1 overflow-hidden rounded-[8px] border">
      <div className="flex flex-col gap-6 px-5 py-6 sm:px-7 sm:py-7">
        <div className="flex flex-col gap-1.5">
          {eyebrow && (
            <span
              className="text-ink-4 text-[10.5px] font-semibold uppercase tracking-[0.12em]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
              {eyebrow}
            </span>
          )}
          <h1 className="text-ink text-[24px] font-bold leading-[1.18] tracking-[-0.02em] sm:text-[26px]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-ink-3 text-[14px] leading-[1.55]">{subtitle}</p>
          )}
        </div>
        {children}
      </div>
      {footer && (
        <div className="border-rule bg-bone-2/60 border-t px-5 py-3 sm:px-7">{footer}</div>
      )}
    </div>
  );
}
