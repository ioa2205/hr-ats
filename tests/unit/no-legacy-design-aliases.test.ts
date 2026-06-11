import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Phase 11 cleanup guard: the compatibility layer that let the old Material and
 * warm "Tez" vocabularies coexist with the unified semantic tokens has been
 * removed. This test fails if any of those legacy aliases reappear in product
 * source, so the platform stays on a single visual system.
 *
 * It does NOT scan tests/ (this file necessarily names the forbidden tokens) or
 * components/landing/landing.css (which defines its own self-contained local
 * `--paper`/`--persimmon` variables that map directly to canonical tokens).
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCAN_DIRS = ["app", "components", "lib"].map((dir) => path.join(ROOT, dir));
const CODE_EXT = new Set([".ts", ".tsx"]);

// Legacy CSS custom-property aliases removed in Phase 11. Each is anchored so it
// cannot match a still-valid canonical token (e.g. `--color-on-surface` matched
// only the removed alias; no real token starts with that string).
const FORBIDDEN_VARS = [
  /--color-bone\b/,
  /--color-paper\b/,
  /--color-ink\b/,
  /--color-rule\b/,
  /--color-persimmon\b/,
  /--color-tez-/,
  /--color-on-surface\b/,
  /--color-outline\b/,
  /--color-surface-container\b/,
  /--color-background\b/,
  /--color-secondary\b/,
  /--color-tertiary\b/,
  /--font-tez-/,
  /--shadow-tez-/,
];

// Legacy Tailwind utility classes generated from those aliases.
const FORBIDDEN_UTILITIES =
  /\b(?:bg|text|border|ring|fill|stroke|from|to|via|divide|placeholder|caret|decoration|outline|shadow|font)-(?:bone|paper|ink|rule|persimmon|tez-(?:blue|green|amber|red|sans|serif|mono|[123])|on-surface|outline-variant|surface-container|secondary|tertiary)\b/;

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      out.push(...walk(full));
    } else if (CODE_EXT.has(path.extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

describe("Phase 11 — one unified visual system", () => {
  const files = SCAN_DIRS.flatMap(walk);

  it("scans a representative slice of the product source", () => {
    // Sanity check the walker is actually finding files (guards against a silent
    // pass if path resolution ever breaks).
    expect(files.length).toBeGreaterThan(200);
  });

  it("has no legacy Material/warm alias tokens in product source", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const rel = path.relative(ROOT, file);
      for (const pattern of FORBIDDEN_VARS) {
        const match = content.match(pattern);
        if (match) offenders.push(`${rel}: ${match[0]}`);
      }
      const util = content.match(FORBIDDEN_UTILITIES);
      if (util) offenders.push(`${rel}: ${util[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it("removed the components/hr/design compatibility export folder", () => {
    expect(existsSync(path.join(ROOT, "components/hr/design"))).toBe(false);
  });

  it("removed the compatibility aliases from globals.css", () => {
    const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf-8");
    for (const pattern of [
      /--color-bone\b/,
      /--color-ink\b/,
      /--color-persimmon\b/,
      /--color-tez-/,
      /--color-on-surface\b/,
      /--color-surface-container\b/,
      /--font-tez-/,
      /--shadow-tez-/,
      /\.text-serif\b/,
    ]) {
      expect(css).not.toMatch(pattern);
    }
  });
});
