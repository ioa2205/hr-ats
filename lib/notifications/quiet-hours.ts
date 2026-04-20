/**
 * Quiet-hours suppression — pure, timezone-agnostic.
 *
 * Hours are stored as 0–23 ints in the caller's view of the day.
 * - start < end: the quiet window is a single contiguous span within the day
 *   (e.g. 13→17 means 13:00–16:59 is quiet).
 * - start > end: the window wraps midnight (22→7 means 22:00–06:59 is quiet).
 * - start == end or either null: quiet hours are disabled; returns false.
 */
export function isWithinQuietHours(
  hour: number,
  start: number | null | undefined,
  end: number | null | undefined,
): boolean {
  if (start == null || end == null) return false;
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}

/** Extract the hour (0–23) of a Date. */
export function hourOf(date: Date): number {
  return date.getHours();
}
