import type { ReactNode } from "react";

/**
 * Per-section settings header. Renders an `h2` (subordinate to the workspace
 * `h1` in the settings layout) so the page hierarchy and existing selectors
 * (e.g. the team spec's `h2` lookup) stay intact. Semantic tokens only.
 */
export function SettingsPageHeader({
  title,
  sub,
  actions,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-[var(--color-line)] pb-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="m-0 text-[20px] font-semibold leading-[1.15] tracking-[-0.018em] text-[var(--color-text)] sm:text-[22px]">
          {title}
        </h2>
        {sub && (
          <p className="mt-2 max-w-[60ch] text-[13px] leading-[1.5] text-[var(--color-text-muted)]">
            {sub}
          </p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
