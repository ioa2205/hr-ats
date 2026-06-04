import { describe, it, expect, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ── Contract test: requireOperatorApi write-gating ──────────────────
// A read-only operator passes the /operator/* gate but must be 403'd on any
// mutation route. The bug class this guards: a mutation route that forgets
// `{ write: true }` silently lets read-only operators suspend/delete tenants,
// promote operators, or start impersonation.
let currentUser: { app_metadata?: Record<string, unknown> } | null = null;

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: currentUser } }) },
  }),
}));

// guards.ts transitively imports the service-role client, which throws under
// jsdom; requireOperatorApi never calls it, so a no-op stub is enough.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({}),
}));

const { requireOperatorApi } = await import("@/lib/auth/guards");

describe("requireOperatorApi — write gating", () => {
  it("401s an unauthenticated caller", async () => {
    currentUser = null;
    expect(await requireOperatorApi({ write: true })).toMatchObject({ ok: false, status: 401 });
  });

  it("403s a non-operator", async () => {
    currentUser = { app_metadata: { is_operator: false } };
    expect(await requireOperatorApi()).toMatchObject({
      ok: false,
      status: 403,
      error: "not_operator",
    });
  });

  it("lets a read-only operator read but 403s write calls", async () => {
    currentUser = { app_metadata: { is_operator: true, operator_role: "read_only" } };
    expect(await requireOperatorApi()).toMatchObject({ ok: true, role: "read_only" });
    expect(await requireOperatorApi({ write: true })).toMatchObject({
      ok: false,
      status: 403,
      error: "read_only_operator",
    });
  });

  it("lets a full operator perform write calls", async () => {
    currentUser = { app_metadata: { is_operator: true, operator_role: "full" } };
    expect(await requireOperatorApi({ write: true })).toMatchObject({ ok: true, role: "full" });
  });
});

// ── Coverage test: every operator mutation route is write-gated ─────
// Statically scans app/api/operator for handlers that mutate state and asserts
// each calls requireOperatorApi({ write: true }). New mutation routes that omit
// the guard fail here.
const here = dirname(fileURLToPath(import.meta.url));
const operatorRoot = resolve(here, "../../app/api/operator");

function walkRoutes(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walkRoutes(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

// Mutation-shaped handlers that are intentionally NOT write-gated, with rationale.
// Keyed by the route's own directory name.
const EXEMPT_DIRS = new Set<string>([
  // read-shaped: generates a short-lived signed URL so an operator can VIEW a
  // CV (audited). Read-only operators are allowed to view tenant data.
  "cv-reveal",
  // data export = a read of tenant data, allowed for read-only operators.
  "export-data",
]);

describe("operator mutation routes require { write: true }", () => {
  const files = walkRoutes(operatorRoot);
  const mutationFiles = files.filter((f) =>
    /export\s+async\s+function\s+(POST|PATCH|PUT|DELETE)/.test(readFileSync(f, "utf8")),
  );

  it("discovers a meaningful number of operator mutation routes", () => {
    expect(mutationFiles.length).toBeGreaterThan(10);
  });

  for (const file of mutationFiles) {
    const src = readFileSync(file, "utf8");
    // CRON_SECRET-gated routes (and impersonate/end) don't use the operator guard.
    if (!src.includes("requireOperatorApi")) continue;
    const routeDir = basename(dirname(file));
    if (EXEMPT_DIRS.has(routeDir)) continue;
    const rel = file.slice(operatorRoot.length).replace(/\\/g, "/");
    it(`writes are guarded in operator${rel}`, () => {
      expect(src).toContain("requireOperatorApi({ write: true })");
    });
  }
});
