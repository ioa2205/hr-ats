import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";
export type AvatarStatus = "online" | "busy" | "offline";

const sizeClass: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-xl",
};

const statusClass: Record<AvatarStatus, string> = {
  online: "bg-[var(--color-success)]",
  busy: "bg-[var(--color-warning)]",
  offline: "bg-[var(--color-line-strong)]",
};

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export interface AvatarProps {
  name: string;
  src?: string | null;
  size?: AvatarSize;
  status?: AvatarStatus;
  /** Use the accent tint for priority/highlighted people. */
  accent?: boolean;
  className?: string;
}

/**
 * Avatar with image + initials fallback. Decorative duplication of an adjacent
 * name is avoided by marking the fallback `aria-hidden`; the `name` still
 * provides alt text when an image is present.
 */
export function Avatar({ name, src, size = "md", status, accent, className }: AvatarProps) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- small avatars don't need next/image
        <img
          src={src}
          alt={name}
          className={cn(
            "rounded-full border border-[var(--color-line)] object-cover",
            sizeClass[size],
          )}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "grid place-items-center rounded-full border font-semibold",
            accent
              ? "border-[var(--color-accent)] bg-[var(--color-accent-container)] text-[var(--color-on-accent-container)]"
              : "border-[var(--color-line)] bg-[var(--color-surface-strong)] text-[var(--color-text-muted)]",
            sizeClass[size],
          )}
        >
          {initials(name)}
        </span>
      )}
      {status && (
        <span
          className={cn(
            "absolute right-0 bottom-0 rounded-full ring-2 ring-[var(--color-surface)]",
            size === "xs" || size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
            statusClass[status],
          )}
        />
      )}
    </span>
  );
}
