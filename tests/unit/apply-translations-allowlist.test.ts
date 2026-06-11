import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Regression guard for the public apply form's translation allow-list.
 *
 * The candidate apply page (`app/apply/[token]/page.tsx`) does NOT ship the
 * whole i18n dictionary to the browser. It picks a hand-curated subset —
 * `APPLY_KEYS` — and passes only those strings to the client `ApplyForm`,
 * whose `t` is `translations[key] ?? key`. So a key that is referenced in the
 * client tree but missing from `APPLY_KEYS` silently renders as its raw dotted
 * name (e.g. the user-visible "apply.step_requirements" leak this guards
 * against), with no type error to catch it.
 *
 * This test fails if any `t("apply.*")` literal used in the ApplyForm client
 * component tree is absent from `APPLY_KEYS`.
 *
 * SCOPE: only the components whose `t` comes from the allow-list-backed
 * callback are bound by it — `apply-form` and the children it passes `t` into
 * (`cv-dropzone`, `success-state`). Other candidate components are excluded on
 * purpose: `closed-state` uses the server `t(key, locale)` (full dictionary),
 * and the interview/scheduling components use their own `interview.*` keys. If
 * `ApplyForm` starts passing its `t` to a new child, add that file here.
 */

const ROOT = process.cwd();
const PAGE = path.join(ROOT, "app/apply/[token]/page.tsx");
const ALLOWLIST_BOUND_FILES = [
  "components/candidate/apply-form.tsx",
  "components/candidate/cv-dropzone.tsx",
  "components/candidate/success-state.tsx",
].map((rel) => path.join(ROOT, rel));

/** Pull the string literals out of the `const APPLY_KEYS: ... = [ ... ];` block. */
function readAllowlist(): Set<string> {
  const src = readFileSync(PAGE, "utf-8");
  const block = src.match(/const APPLY_KEYS[^=]*=\s*\[([\s\S]*?)\]/);
  if (!block) throw new Error("Could not locate the APPLY_KEYS array in the apply page");
  const keys = block[1].match(/["']apply\.[a-zA-Z0-9_.]+["']/g) ?? [];
  return new Set(keys.map((k) => k.slice(1, -1)));
}

/** Every `t("apply.*")` literal referenced in a file. */
function usedApplyKeys(file: string): Set<string> {
  const src = readFileSync(file, "utf-8");
  const out = new Set<string>();
  const re = /\bt\(\s*["'](apply\.[a-zA-Z0-9_.]+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) out.add(m[1]);
  return out;
}

describe("apply form translation allow-list", () => {
  const allowlist = readAllowlist();

  it("extracts a non-trivial allow-list and key references (guards the parser)", () => {
    expect(allowlist.size).toBeGreaterThan(20);
    const allUsed = ALLOWLIST_BOUND_FILES.flatMap((f) => [...usedApplyKeys(f)]);
    expect(allUsed.length).toBeGreaterThan(20);
  });

  it("ships every apply.* key referenced in the ApplyForm client tree", () => {
    const missing: string[] = [];
    for (const file of ALLOWLIST_BOUND_FILES) {
      for (const key of usedApplyKeys(file)) {
        if (!allowlist.has(key)) {
          missing.push(`${path.relative(ROOT, file)}: ${key}`);
        }
      }
    }
    expect(missing).toEqual([]);
  });
});
