import { cn } from "@/lib/utils";

const PALETTE = ["#E6DFCB", "#D6CDB6", "#EFE9D9", "#DCEBDD", "#DBE3F1", "#F4E4C2", "#F1D5CF"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function Avatar({
  name,
  url,
  size = "md",
  persimmon = false,
  className,
}: {
  name: string;
  url?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  persimmon?: boolean;
  className?: string;
}) {
  const bg = persimmon ? "var(--color-persimmon)" : PALETTE[name.length % PALETTE.length];
  const color = persimmon ? "#fff" : "var(--color-ink-2)";
  const dims =
    size === "sm"
      ? "h-5 w-5 text-[9px]"
      : size === "lg"
        ? "h-10 w-10 text-[14px]"
        : size === "xl"
          ? "h-14 w-14 text-[18px]"
          : "h-6 w-6 text-[10px]";

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 256px avatars don't need next/image
      <img
        src={url}
        alt={name}
        className={cn(
          "border-rule shrink-0 rounded-full border object-cover",
          dims,
          className,
        )}
      />
    );
  }

  return (
    <div
      aria-hidden
      style={{ background: bg, color }}
      className={cn(
        "border-rule inline-grid shrink-0 place-items-center rounded-full border font-semibold",
        dims,
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
