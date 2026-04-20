import type { Locale } from "./types";

/**
 * Resolves the best-available value across per-locale columns.
 *
 * Preference:
 *   1. The viewer's current locale
 *   2. The company's default locale (if provided)
 *   3. A final `fallback` string (the legacy single-language column)
 *
 * Empty strings are treated as missing — only non-empty values win.
 */
export function pickLocalized(
  values: { ru?: string | null; uz?: string | null; en?: string | null },
  viewerLocale: Locale,
  fallback: string,
  companyDefault?: Locale | string | null,
): string {
  const candidates: (string | null | undefined)[] = [values[viewerLocale]];
  if (companyDefault && (companyDefault === "ru" || companyDefault === "uz" || companyDefault === "en")) {
    candidates.push(values[companyDefault]);
  }
  candidates.push(fallback);

  for (const c of candidates) {
    if (typeof c === "string" && c.trim().length > 0) return c;
  }
  return fallback;
}

/**
 * Picks the best-available array across per-locale columns. Used for
 * trilingual AI analysis fields (strengths, gaps) where each locale
 * holds its own array.
 */
export function pickLocalizedArray(
  values: { ru?: string[] | null; uz?: string[] | null; en?: string[] | null },
  viewerLocale: Locale,
  fallback: string[],
  companyDefault?: Locale | string | null,
): string[] {
  const candidates: (string[] | null | undefined)[] = [values[viewerLocale]];
  if (
    companyDefault &&
    (companyDefault === "ru" || companyDefault === "uz" || companyDefault === "en")
  ) {
    candidates.push(values[companyDefault]);
  }
  candidates.push(fallback);

  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  return fallback;
}

/** Pull the right label from a hard-requirement with ru/uz/en. */
export function pickRequirementLabel(
  req: { label_ru: string; label_uz: string; label_en?: string },
  viewerLocale: Locale,
  companyDefault?: Locale | string | null,
): string {
  return pickLocalized(
    { ru: req.label_ru, uz: req.label_uz, en: req.label_en },
    viewerLocale,
    req.label_ru,
    companyDefault,
  );
}
