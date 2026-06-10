import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

interface CenteredStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

/**
 * Error state for failed loads/sections. Pair the `action` with a retry button.
 * Announced politely so assistive tech notices the failure without stealing focus.
 */
export function ErrorState({
  title,
  description,
  action,
  className,
  compact,
  icon,
}: CenteredStateProps & { icon?: ReactNode }) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center",
        compact ? "py-10" : "py-16",
        className,
      )}
    >
      <div
        className="grid h-16 w-16 place-items-center rounded-[var(--radius-xl)] bg-[var(--color-danger-container)] text-[var(--color-danger)]"
        aria-hidden="true"
      >
        {icon ?? <AlertTriangle className="h-8 w-8" />}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Success confirmation state (e.g. after a flow completes). */
export function SuccessState({
  title,
  description,
  action,
  className,
  compact,
  icon,
}: CenteredStateProps & { icon?: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center",
        compact ? "py-10" : "py-16",
        className,
      )}
    >
      <div
        className="grid h-16 w-16 place-items-center rounded-[var(--radius-xl)] bg-[var(--color-success-container)] text-[var(--color-success)]"
        aria-hidden="true"
      >
        {icon ?? <CheckCircle2 className="h-8 w-8" />}
      </div>
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-[var(--color-text)]">{title}</h3>
        {description && (
          <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>
        )}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/**
 * Loading state with an accessible label. The caller passes a localized label
 * (e.g. t("common.loading")). Prefer skeletons for content-shaped loads.
 */
export function LoadingState({
  label,
  className,
  compact,
}: {
  label: string;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        compact ? "py-10" : "py-16",
        className,
      )}
    >
      <Spinner size="lg" label={label} className="text-[var(--color-primary)]" />
      <p className="text-sm text-[var(--color-text-muted)]">{label}</p>
    </div>
  );
}
