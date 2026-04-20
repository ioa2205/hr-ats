import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

/**
 * Phone OTP signup happy path (with mocked Eskiz).
 *
 * In dev mode, the Eskiz client logs OTP to the console instead of sending SMS.
 * We simulate the flow by calling the API routes directly and verifying the
 * multi-step UI progression.
 *
 * The OTP is generated server-side. Since we can't read it from the console
 * in Playwright, we use the admin client to query phone_otp_attempts and
 * reverse-hash isn't possible — so we drive the API routes and rely on the
 * "dev mode" log. For the E2E we intercept the /start route to capture the
 * OTP from the phone_otp_attempts table (unhashed comparison isn't possible,
 * but we can generate a known OTP via direct DB insertion).
 *
 * Strategy: insert a known OTP hash into phone_otp_attempts, then submit
 * it through the UI.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const hasSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE);

test.describe("Auth: phone OTP signup", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  test("user can navigate to phone signup page", async ({ page }) => {
    await page.goto("/auth/login");

    // "Continue with Phone" button should be visible
    const phoneLink = page.getByRole("link", { name: /continue with phone/i });
    await expect(phoneLink).toBeVisible();

    await phoneLink.click();
    await page.waitForURL(/\/auth\/signup-phone/);

    await expect(page.getByRole("heading", { name: /sign up with phone/i })).toBeVisible();
  });

  test("phone signup page shows phone input on step 1", async ({ page }) => {
    await page.goto("/auth/signup-phone");

    // Step 1: phone number form
    await expect(page.getByLabel(/phone number/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /send code/i })).toBeVisible();
    await expect(page.getByText(/already have an account/i)).toBeVisible();
  });

  test("rejects invalid phone number format", async ({ page }) => {
    await page.goto("/auth/signup-phone");

    // Submit an invalid phone number via API interception
    await page.getByLabel(/phone number/i).fill("12345");
    await page.getByRole("button", { name: /send code/i }).click();

    // Should show an error (API returns 400 for invalid phone).
    // Scope to the visible error copy — Next's __next-route-announcer__ also
    // has role=alert and would trip strict mode.
    await expect(page.getByText(/invalid phone number/i)).toBeVisible();
  });

  test("full phone signup flow with mocked OTP", async ({ page }) => {
    const admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const phone = `+998${900000000 + Math.floor(Math.random() * 99999999)}`;
    const email = `e2e-phone-${Date.now()}@test.hrats.local`;
    const fullName = "Phone Test User";

    // Manually insert a known OTP into the database so we know the code
    const { createHash } = await import("crypto");
    const knownCode = "123456";
    const codeHash = createHash("sha256").update(knownCode).digest("hex");

    await admin.from("phone_otp_attempts").insert({
      phone,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    await page.goto("/auth/signup-phone");

    // Step 1: Enter phone — but we skip the /start call by intercepting it
    // and go straight to "otp" step since we pre-inserted the OTP
    await page.route("**/api/auth/signup-phone/start", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.getByLabel(/phone number/i).fill(phone);
    await page.getByRole("button", { name: /send code/i }).click();

    // Step 2: Enter OTP code
    await expect(page.getByLabel(/verification code/i)).toBeVisible({ timeout: 5000 });
    await page.getByLabel(/verification code/i).fill(knownCode);
    await page.getByRole("button", { name: /verify/i }).click();

    // Step 3: Enter email + name
    await expect(page.getByLabel(/full name/i)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/phone verified/i)).toBeVisible();

    await page.getByLabel(/full name/i).fill(fullName);
    await page.getByLabel(/email/i).fill(email);
    await page.getByRole("button", { name: /create account/i }).click();

    // Should redirect to onboarding or login
    await page.waitForURL(/\/(onboarding|auth\/login|hr\/dashboard)/, {
      timeout: 10000,
    });

    // ── Cleanup ───────────────────────────────────────────────────────
    await admin.from("phone_otp_attempts").delete().eq("phone", phone);
    const { data: userList } = await admin.auth.admin.listUsers();
    const created = userList?.users.find((u) => u.email === email);
    if (created) {
      await admin.auth.admin.deleteUser(created.id);
    }
  });
});
