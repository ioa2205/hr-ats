/**
 * Pure anti-staleness intelligence for the Telegram connector. No AI, no IO —
 * deterministic so every rule is unit-tested with plain strings and fixed
 * clocks. These rules are the core of "smart" sourcing: they decide what is
 * fresh, what is the latest repost, and who has stopped looking.
 *
 *  - Hard recency cutoff: a post older than the age window is never ingested.
 *  - Active / closed intent: phrase heuristics (ru/uz/en) boost "still looking"
 *    and DROP "found a job / position closed". Closed wins ties (fail-closed).
 *  - Repost collapse / latest-wins: the same person re-posts across channels and
 *    monthly; we keep only their newest message (a recent repost is a strong
 *    "still active" signal, not a duplicate to penalize).
 */

/** Parse an ISO-8601 timestamp to epoch ms, or null if unparseable. */
export function parsePostedAt(postedAt: string): number | null {
  const ms = Date.parse(postedAt);
  return Number.isNaN(ms) ? null : ms;
}

/** Whole days between `postedAt` and `nowMs` (negative if in the future), or null. */
export function ageInDays(postedAt: string, nowMs: number): number | null {
  const ms = parsePostedAt(postedAt);
  if (ms === null) return null;
  return Math.floor((nowMs - ms) / 86_400_000);
}

/**
 * True if the post is within the age window. Fail-closed: an unparseable date is
 * treated as NOT within the window (we never ingest a post we cannot date).
 */
export function withinAgeWindow(postedAt: string, maxAgeDays: number, nowMs: number): boolean {
  const age = ageInDays(postedAt, nowMs);
  if (age === null) return false;
  // A future-dated post (clock skew) is age < 0 — keep it; it is not stale.
  return age <= maxAgeDays;
}

// ===================================================================
// Active / closed intent detection (ru / uz / en).
// ===================================================================

/** "I'm actively looking for work right now" phrases. */
const ACTIVE_PHRASES: readonly string[] = [
  // ru
  "ищу работу",
  "ищу вакансию",
  "в поиске работы",
  "в поиске работа",
  "открыт к предложениям",
  "открыта к предложениям",
  "рассмотрю предложения",
  "рассмотрю вакансии",
  "срочно ищу",
  "ищу подработку",
  "резюме",
  // uz
  "ish qidiryapman",
  "ish qidiraman",
  "ish kerak",
  "ish izlayapman",
  "вакансия керак",
  // en
  "open to work",
  "looking for a job",
  "looking for work",
  "seeking a position",
  "available for hire",
  "actively looking",
];

/** "I already found work / this is no longer relevant" phrases. */
const CLOSED_PHRASES: readonly string[] = [
  // ru
  "нашёл работу",
  "нашел работу",
  "нашла работу",
  "уже нашёл",
  "уже нашел",
  "уже нашла",
  "вакансия закрыта",
  "позиция закрыта",
  "уже не актуально",
  "не актуально",
  "вопрос закрыт",
  "больше не ищу",
  // uz
  "ish topdim",
  "ish topildi",
  "yopildi",
  "dolzarb emas",
  // en
  "found a job",
  "found work",
  "position filled",
  "no longer looking",
  "no longer available",
  "vacancy closed",
];

export interface IntentSignal {
  /** an active-intent phrase is present. */
  active: boolean;
  /** a closed/done phrase is present (drop the message). */
  closed: boolean;
}

function containsAny(haystack: string, phrases: readonly string[]): boolean {
  return phrases.some((phrase) => haystack.includes(phrase));
}

/**
 * Detect active / closed intent from a message body. Case-insensitive;
 * whitespace-collapsed so line breaks between words still match. Closed and
 * active are independent flags — the caller decides precedence (the connector
 * drops `closed` even when `active` is also set).
 */
export function detectIntent(text: string): IntentSignal {
  const hay = text.toLowerCase().replace(/\s+/g, " ");
  return {
    active: containsAny(hay, ACTIVE_PHRASES),
    closed: containsAny(hay, CLOSED_PHRASES),
  };
}

/** True if the message explicitly signals the author is done looking. */
export function isClosedSignal(text: string): boolean {
  return detectIntent(text).closed;
}

/**
 * The first active-intent phrase as it VERBATIM appears in the message (original
 * casing preserved), or null. Used by the normalizer to attach an
 * `actively_looking` field with a real quote — we only ever claim active intent
 * we can cite.
 */
export function findActivePhrase(text: string): string | null {
  const hay = text.toLowerCase().replace(/\s+/g, " ");
  let best: { index: number; length: number } | null = null;
  for (const phrase of ACTIVE_PHRASES) {
    const idx = hay.indexOf(phrase);
    if (idx !== -1 && (best === null || idx < best.index)) {
      best = { index: idx, length: phrase.length };
    }
  }
  if (best === null) return null;
  // Map the index in the whitespace-collapsed haystack back to a clean verbatim
  // slice. Collapsing only ever shrinks runs of whitespace, so re-collapsing the
  // original and slicing yields the phrase with its original word casing.
  return text.replace(/\s+/g, " ").slice(best.index, best.index + best.length);
}

// ===================================================================
// Repost collapse / latest-wins.
// ===================================================================

/**
 * Collapse items that share a grouping key (a normalized contact handle),
 * keeping only the newest by `posted_at`. The same person posting to several
 * channels — or re-posting monthly — yields ONE record: their most recent
 * message. Deterministic: output preserves the first-seen order of the surviving
 * (newest) item per key; an item whose date is unparseable sorts oldest so a
 * dated repost always wins over it.
 */
export function collapseReposts<T>(
  items: readonly T[],
  keyOf: (item: T) => string,
  postedAtOf: (item: T) => string,
): T[] {
  interface Slot {
    item: T;
    at: number;
    order: number;
  }
  const bestByKey = new Map<string, Slot>();
  items.forEach((item, order) => {
    const key = keyOf(item);
    const at = parsePostedAt(postedAtOf(item)) ?? Number.NEGATIVE_INFINITY;
    const current = bestByKey.get(key);
    if (!current || at > current.at) {
      // Keep the original first-seen order so output ordering is stable.
      bestByKey.set(key, { item, at, order: current ? current.order : order });
    }
  });
  return [...bestByKey.values()].sort((a, b) => a.order - b.order).map((slot) => slot.item);
}
