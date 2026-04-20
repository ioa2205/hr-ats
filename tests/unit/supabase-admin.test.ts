import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("supabase admin client", () => {
  const originalWindow = globalThis.window;

  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    // Restore window
    if (originalWindow === undefined) {
      // @ts-expect-error -- restoring undefined window for Node env
      delete globalThis.window;
    }
  });

  it("initializes without crashing in server environment", async () => {
    // Ensure window is undefined (server env)
    // @ts-expect-error -- simulating server environment
    delete globalThis.window;

    const { createAdminClient } = await import("@/lib/supabase/admin");
    const client = createAdminClient();
    expect(client).toBeDefined();
  });

  it("throws when imported in browser environment", async () => {
    // Simulate browser environment
    // @ts-expect-error -- simulating browser environment
    globalThis.window = {};

    await expect(import("@/lib/supabase/admin")).rejects.toThrow(
      "supabaseAdmin must not be used in client components",
    );
  });
});
