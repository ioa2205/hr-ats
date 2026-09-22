import { test, expect, type BrowserContext } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Password reset flow end-to-end.
 *
 * Covers: signup → request reset → follow reset link (via admin.generateLink
 * since local Supabase doesn't deliver email) → set new password → log in.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in env.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE);

async function useEnglishLocale(context: BrowserContext) {
  await context.addCookies([
    { name: "locale", value: "en", url: "http://localhost:3000", sameSite: "Lax" },
  ]);
}

test.beforeEach(async ({ context }) => {
  await useEnglishLocale(context);
});

test.describe("Auth: password reset", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  test("request reset → set new password → sign in", async ({ page }) => {
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const email = `reset-${Date.now()}@example.com`;
    const oldPassword = "OldPassword123!";
    const newPassword = "NewPassword456!";

    // ── 1. Create + confirm the user directly via admin API ──────────
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: oldPassword,
      email_confirm: true,
      user_metadata: { full_name: "Reset Test User" },
    });
    expect(createErr, "admin createUser should succeed").toBeNull();
    expect(created?.user?.id, "user id should exist").toBeTruthy();

    // ── 2. Request the reset via the UI form ──────────────────────────
    await page.goto("/auth/reset");
    await page.getByLabel(/email/i).fill(email);
    await page
      .getByRole("button", { name: /send reset link|отправить|yuborish/i })
      .first()
      .click();

    // Success banner should appear — don't assert exact copy since it's
    // localized and depends on browser locale resolution. Just confirm
    // the form transitioned to the sent state by checking for the
    // back-to-login link being the only interactive element left.
    await expect(page.getByRole("link", { name: /sign in|войти|kirish/i })).toBeVisible({
      timeout: 10_000,
    });

    // ── 3. Generate the actual recovery link (local Supabase doesn't
    //        deliver email — we'd otherwise get this from the inbox).
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: "http://localhost:3000/auth/callback?next=/auth/reset" },
    });
    expect(linkError, "generateLink should succeed").toBeNull();
    const tokenHash = linkData?.properties?.hashed_token;
    expect(tokenHash, "hashed_token should be present").toBeTruthy();

    // ── 4. Follow the recovery link → callback → /auth/reset with session
    await page.goto(
      `/auth/callback?token_hash=${encodeURIComponent(tokenHash!)}&type=recovery&next=/auth/reset`,
    );
    await page.waitForURL(/\/auth\/reset/, { timeout: 15_000 });

    // ── 5. Set new password ───────────────────────────────────────────
    await page.locator('input[name="password"]').fill(newPassword);
    await page
      .getByRole("button", { name: /update password|обновить|yangilash/i })
      .first()
      .click();

    await page.waitForURL(/\/(hr\/dashboard|onboarding)/, { timeout: 15_000 });

    // ── 6. Sign out + sign in with new password ──────────────────────
    await page.request.post("/api/auth/logout").catch(() => undefined);
    await page.context().clearCookies();
    await useEnglishLocale(page.context());

    await page.goto("/auth/login");
    await page.getByLabel(/email/i).fill(email);
    await page.locator('input[name="password"]').fill(newPassword);
    await page.getByRole("button", { name: /sign in|войти|kirish/i }).click();
    await page.waitForURL(/\/(hr\/dashboard|onboarding)/, { timeout: 15_000 });

    // Clean up
    if (created?.user?.id) {
      await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    }
  });
});
