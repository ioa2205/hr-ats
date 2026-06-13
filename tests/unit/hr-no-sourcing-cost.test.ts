import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Product rule: AI token/dollar cost is operator-only telemetry. HR users must
 * never see how much a sourcing run (or CV screening) cost — only operators do,
 * on the dashboard and company-detail surfaces.
 *
 * This guard fails if any HR-facing page or component reintroduces a cost/token
 * reference. The operator surfaces (app/(operator), components/operator) are
 * intentionally excluded — that's where cost belongs.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCAN_DIRS = [path.join(ROOT, "app", "(hr)"), path.join(ROOT, "components", "hr")];
const CODE_EXT = new Set([".ts", ".tsx"]);

// Anchored to the exact identifiers that carry AI spend. `cost_usd` /
// `input_tokens` / `output_tokens` are the sourcing_searches + ai_attempts
// money columns; `cost_label` is the removed i18n key. A bare `tokens` is NOT
// forbidden (HR template editing legitimately uses placeholder "tokens").
const FORBIDDEN = [/\bcost_usd\b/, /\binput_tokens\b/, /\boutput_tokens\b/, /cost_label/];

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

describe("HR portal never surfaces AI cost", () => {
  const files = SCAN_DIRS.flatMap(walk);

  it("finds HR source files to scan", () => {
    // Guard against a silent pass if path resolution ever breaks.
    expect(files.length).toBeGreaterThan(10);
  });

  it("has no AI cost or token references in HR-facing source", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const content = readFileSync(file, "utf-8");
      const rel = path.relative(ROOT, file);
      for (const pattern of FORBIDDEN) {
        const match = content.match(pattern);
        if (match) offenders.push(`${rel}: ${match[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
