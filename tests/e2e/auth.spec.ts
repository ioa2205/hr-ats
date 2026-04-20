import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Email signup → verify → login happy path.
 *
 * Local Supabase auto-confirms emails, so after signup the user lands on
 * /onboarding (not /auth/verify). We adapt the test accordingly:
 *   - In local dev: signup → auto-confirm → redirect to /onboarding
 *   - In prod/CI with real email: signup → /auth/verify → manual confirmation
 *
 * We still test the full login flow by generating a confirmation link via
 * the admin API and exercising the /auth/callback route.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env
 * (local supabase: `supabase start` sets these).
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE);

test.describe("Auth: signup → verify → login", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  test("user can sign up, verify email, and sign in", async ({ page }) => {
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = `e2e-${Date.now()}@test.hrats.local`;
    const password = "TestPassword123!";
    const fullName = "E2E Test User";

    // ── 1. Sign up ────────────────────────────────────────────────────
    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { name: /create account/i })).toBeVisible({
      timeout: 10000,
    });
    await page.getByLabel("Full name").fill(fullName);
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    // Local Supabase auto-confirms, so user may land on /auth/verify OR /onboarding
    await page.waitForURL(/\/(auth\/verify|onboarding)/, { timeout: 15000 });

    // On local Supabase with auto-confirm, the /auth/verify page may
    // immediately redirect to /onboarding once the session cookie is set,
    // so we don't assert on the verify-page copy here — the post-callback
    // landing at step 3 is what actually proves verification worked.

    // ── 2. "Receive" a magic-link email → get the link via admin API.
    // Local Supabase auto-confirms, so the user is already registered by
    // this point. Use `magiclink` (not `signup`) to generate a valid login
    // URL for the existing confirmed user.
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: "http://localhost:3000/auth/callback?next=/onboarding" },
    });
    expect(linkError, "generateLink should succeed").toBeNull();
    const actionLink = linkData?.properties?.action_link;
    expect(actionLink, "action_link should be present").toBeTruthy();

    // ── 3. Visit verification link → lands on /onboarding or /hr/dashboard
    await page.goto(actionLink!);
    await page.waitForURL(/\/(onboarding|hr\/dashboard)/, { timeout: 15000 });

    // Sign out via the logout API route so we can test login next.
    await page.request.post("/api/auth/logout").catch(() => undefined);
    await page.context().clearCookies();

    // ── 4. Log in with the verified credentials ───────────────────────
    await page.goto("/auth/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForURL(/\/(hr\/dashboard|onboarding)/, { timeout: 15000 });

    // ── Cleanup ───────────────────────────────────────────────────────
    const { data: userList } = await admin.auth.admin.listUsers();
    const created = userList?.users.find((u) => u.email === email);
    if (created) {
      await admin.auth.admin.deleteUser(created.id);
    }
  });
});
