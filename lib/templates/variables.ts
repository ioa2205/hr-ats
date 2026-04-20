/**
 * Template variable parsing — used by the Templates settings editor to
 * highlight unknown tokens, drive locale-parity warnings, and render the
 * live preview against a fixture candidate.
 */

export const KNOWN_VARIABLES = [
  "name",
  "position",
  "company",
  "interview_link",
  "your_name",
] as const;

export type KnownVariable = (typeof KNOWN_VARIABLES)[number];

const TOKEN_RE = /\{([a-z0-9_]+)\}/gi;

/** Extract the raw variable names used in a template (duplicates removed). */
export function extractVariables(template: string): string[] {
  const seen = new Set<string>();
  for (const match of template.matchAll(TOKEN_RE)) {
    seen.add(match[1].toLowerCase());
  }
  return [...seen];
}

/** Variables used in the template that are NOT in the known allow-list. */
export function unknownVariables(template: string): string[] {
  const known = new Set<string>(KNOWN_VARIABLES);
  return extractVariables(template).filter((v) => !known.has(v as KnownVariable));
}

/**
 * Given trilingual templates, returns the set of locales that are missing
 * at least one variable present in the other locales. Empty set = parity.
 */
export function detectLocaleParity(templates: {
  ru: string;
  uz: string;
  en: string;
}): Record<"ru" | "uz" | "en", boolean> {
  const byLocale = {
    ru: new Set(extractVariables(templates.ru)),
    uz: new Set(extractVariables(templates.uz)),
    en: new Set(extractVariables(templates.en)),
  };
  const union = new Set<string>([...byLocale.ru, ...byLocale.uz, ...byLocale.en]);
  return {
    ru: Array.from(union).some((v) => !byLocale.ru.has(v)),
    uz: Array.from(union).some((v) => !byLocale.uz.has(v)),
    en: Array.from(union).some((v) => !byLocale.en.has(v)),
  };
}

/**
 * Substitute a fixture record's values into a template. Unknown tokens are
 * left verbatim so the preview makes the gap visible.
 */
export function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(TOKEN_RE, (match, name: string) => {
    const v = values[name.toLowerCase()];
    return v ?? match;
  });
}
