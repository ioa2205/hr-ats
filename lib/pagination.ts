export interface PageBounds {
  /** clamped current page, 1-based and never beyond totalPages. */
  page: number;
  totalPages: number;
  /** 0-based inclusive range for Supabase `.range(from, to)` / Array.slice. */
  from: number;
  to: number;
}

/**
 * Resolve a user-supplied page param against a known item count. Tolerates
 * missing / non-numeric / out-of-range input by clamping to [1, totalPages];
 * totalPages is at least 1 even when empty.
 */
export function pageBounds(
  totalItems: number,
  pageInput: string | number | undefined,
  pageSize: number,
): PageBounds {
  const requested =
    typeof pageInput === "string" ? parseInt(pageInput, 10) : (pageInput ?? 1);
  const totalPages = Math.max(1, Math.ceil(Math.max(0, totalItems) / pageSize));
  const page =
    Number.isFinite(requested) && requested >= 1
      ? Math.min(totalPages, Math.floor(requested))
      : 1;
  const from = (page - 1) * pageSize;
  return { page, totalPages, from, to: from + pageSize - 1 };
}
