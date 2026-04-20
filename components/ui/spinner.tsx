import { cn } from "@/lib/utils";

export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /**
   * Accessible label for screen readers. Caller passes a translated string
   * (e.g. t("common.loading")). Defaults to "Loading" as a neutral fallback
   * for the rare case where the component is rendered outside any locale
   * context (e.g. error boundaries before i18n hydrates).
   */
  label?: string;
}

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

export function Spinner({ size = "md", className, label = "Loading" }: SpinnerProps) {
  const px = sizeMap[size];
  return (
    <svg
      className={cn("animate-spin text-current", className)}
      width={px}
      height={px}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="status"
      aria-label={label}
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
