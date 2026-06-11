import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The contrast contract reads the shipped token values straight out of
 * globals.css, so the test can never drift from the palette users see.
 * Light roles live in the `@theme` block; dark roles in the `.theme-dark`
 * override block. Resolved from the vitest root (the project directory)
 * because `import.meta.url` is not a file URL in the jsdom environment.
 */
const css = readFileSync(path.resolve(process.cwd(), "app/globals.css"), "utf8");

function extractBlock(source: string, marker: string): string {
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Block marker not found: ${marker}`);
  const open = source.indexOf("{", start);
  const close = source.indexOf("}", open);
  return source.slice(open + 1, close);
}

function parseColorVars(block: string): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const match of block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\b/g)) {
    vars[match[1]] = match[2];
  }
  return vars;
}

const themes = {
  light: parseColorVars(extractBlock(css, "@theme")),
  dark: parseColorVars(extractBlock(css, ".theme-dark")),
};

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/../g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) => (channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string) {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

const PAIRS: ReadonlyArray<readonly [foreground: string, background: string]> = [
  ["text", "canvas"],
  ["text-strong", "canvas"],
  ["text-muted", "canvas"],
  ["text-subtle", "canvas"],
  ["text", "surface"],
  ["text-muted", "surface-subtle"],
  ["primary", "surface"],
  ["on-primary", "primary"],
  ["accent", "surface"],
  ["on-accent", "accent"],
  ["danger", "surface"],
  ["on-danger", "danger"],
];

describe("TezHR semantic contrast contract (Pure Signal)", () => {
  for (const [themeName, theme] of Object.entries(themes)) {
    it(`${themeName} theme parses all roles from globals.css`, () => {
      for (const role of new Set(PAIRS.flat())) {
        expect(theme[role], `--color-${role} missing in ${themeName}`).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    });

    it(`${themeName} text and brand roles meet WCAG AA`, () => {
      for (const [foreground, background] of PAIRS) {
        const ratio = contrast(theme[foreground], theme[background]);
        expect(
          ratio,
          `${foreground} (${theme[foreground]}) on ${background} (${theme[background]}) = ${ratio.toFixed(2)}`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
