/**
 * Company slug validation — pure, testable.
 *
 * Slug contract:
 *   - 3–32 chars
 *   - ASCII lowercase letters, digits, hyphen
 *   - cannot start or end with a hyphen
 *   - cannot collide with a reserved word
 */

export const RESERVED_SLUGS = new Set([
  "www",
  "app",
  "api",
  "admin",
  "operator",
  "auth",
  "signup",
  "signin",
  "login",
  "logout",
  "apply",
  "interview",
  "hr",
  "onboarding",
  "contact",
  "about",
  "privacy",
  "terms",
  "legal",
  "dashboard",
  "help",
  "support",
  "status",
  "docs",
  "blog",
  "static",
  "public",
  "assets",
  "tezhr",
  "anthropic",
  "google",
]);

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])?$/;

export type SlugValidation =
  | { ok: true }
  | { ok: false; reason: "too_short" | "too_long" | "bad_chars" | "reserved" };

export function validateSlug(slug: string): SlugValidation {
  const s = slug.trim().toLowerCase();
  if (s.length < 3) return { ok: false, reason: "too_short" };
  if (s.length > 32) return { ok: false, reason: "too_long" };
  if (!SLUG_RE.test(s)) return { ok: false, reason: "bad_chars" };
  if (RESERVED_SLUGS.has(s)) return { ok: false, reason: "reserved" };
  return { ok: true };
}
