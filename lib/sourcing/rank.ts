/**
 * Deterministic ranking (Phase 1.4 stage 6). Sort by score descending; ties
 * break on identity_key so the order is stable and reproducible across runs.
 * Take at most `size` and assign 1-based ranks. NEVER pads: if fewer than
 * `size` entries are passed in (because fewer passed the gate), fewer come out.
 */
import { SHORTLIST_SIZE } from "./types";

export interface ScoredEntry {
  identity_key: string;
  score: number;
  /** near-miss candidates (some tolerated requirement unmet) always rank below
   *  full matches, regardless of their raw score. */
  near_miss?: boolean;
}

export function rankAndShortlist<T extends ScoredEntry>(
  entries: T[],
  size: number = SHORTLIST_SIZE,
): Array<T & { rank: number }> {
  const sorted = [...entries].sort((a, b) => {
    // Full matches first, near-misses after — score never lifts a near-miss
    // above a clean match.
    const aMiss = a.near_miss ? 1 : 0;
    const bMiss = b.near_miss ? 1 : 0;
    if (aMiss !== bMiss) return aMiss - bMiss;
    if (b.score !== a.score) return b.score - a.score;
    if (a.identity_key < b.identity_key) return -1;
    if (a.identity_key > b.identity_key) return 1;
    return 0;
  });
  return sorted.slice(0, Math.max(0, size)).map((entry, index) => ({ ...entry, rank: index + 1 }));
}
