"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationProps {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Localized labels. */
  labels?: {
    nav?: string;
    previous?: string;
    next?: string;
    /** Template with {page}, e.g. "Page {page}". */
    page?: string;
  };
  /** How many numbered pages to show around the current one. */
  siblingCount?: number;
  className?: string;
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Pagination control. Numbered pages collapse with ellipses on small ranges;
 * the active page is announced via `aria-current="page"`.
 */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  labels,
  siblingCount = 1,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  const navLabel = labels?.nav ?? "Pagination";
  const pageLabel = (n: number) => (labels?.page ? labels.page.replace("{page}", String(n)) : `Page ${n}`);

  const left = Math.max(2, page - siblingCount);
  const right = Math.min(pageCount - 1, page + siblingCount);
  const items: (number | "ellipsis-l" | "ellipsis-r")[] = [1];
  if (left > 2) items.push("ellipsis-l");
  items.push(...range(left, right));
  if (right < pageCount - 1) items.push("ellipsis-r");
  if (pageCount > 1) items.push(pageCount);

  const buttonBase =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-[var(--radius-md)] px-2 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav aria-label={navLabel} className={cn("flex items-center gap-1", className)}>
      <button
        type="button"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label={labels?.previous ?? "Previous page"}
        className={cn(buttonBase, "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]")}
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {items.map((item) =>
        typeof item === "number" ? (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? "page" : undefined}
            aria-label={pageLabel(item)}
            className={cn(
              buttonBase,
              "data-mono",
              item === page
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]",
            )}
          >
            {item}
          </button>
        ) : (
          <span
            key={item}
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center text-[var(--color-text-subtle)]"
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ),
      )}
      <button
        type="button"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label={labels?.next ?? "Next page"}
        className={cn(buttonBase, "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]")}
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
