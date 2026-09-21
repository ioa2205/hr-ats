import { test, expect } from "@playwright/test";
import { getAdminClient, hasSupabase } from "./utils/tenant";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: "locale",
      value: "en",
      url: "http://localhost:3000",
      sameSite: "Lax",
    },
  ]);
});

test.describe("Public account shell", () => {
  test("covers login, callback feedback, signup, verification, and reset routes", async ({
    page,
  }) => {
    await page.goto("/auth/login");
    await expect(page.getByRole("heading", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByText("Welcome back.")).toBeVisible();
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /continue with phone/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /forgot password/i })).toHaveAttribute(
      "href",
      "/auth/reset",
    );

    await page.goto("/auth/login?error=oauth_failed");
    await expect(page.getByText(/sign-in link is invalid or has expired/i)).toBeVisible();

    await page.goto("/auth/login?notice=account_created");
    await expect(page.getByRole("status")).toContainText(/account was created/i);

    await page.goto("/auth/signup");
    await expect(page.getByRole("heading", { name: "Create account", exact: true })).toBeVisible();
    await expect(page.getByText(/14-day free trial/i)).toBeVisible();
    await expect(page.getByText(/no credit card required/i)).toBeVisible();
    await expect(page.getByLabel("Full name")).toBeVisible();

    await page.goto("/auth/verify?email=person%40example.com&next=%2Fonboarding");
    await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();
    await expect(page.getByText(/person@example.com/)).toBeVisible();
    await expect(page.getByRole("button", { name: /resend verification email/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /back to sign in/i })).toHaveAttribute(
      "href",
      "/auth/login?next=%2Fonboarding",
    );

    await page.goto("/auth/reset");
    await expect(page.getByRole("heading", { name: /reset password/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("preserves invitation context across alternative signup entry points", async ({ page }) => {
    const invite = "invite-token-123";
    const email = "invited@example.com";
    await page.goto(`/auth/signup?invite=${invite}&email=${encodeURIComponent(email)}`);

    await expect(page.getByLabel("Email")).toHaveValue(email);
    await expect(page.getByLabel("Email")).toHaveAttribute("readonly", "");

    const phoneLink = page.getByRole("link", { name: /continue with phone/i });
    const href = await phoneLink.getAttribute("href");
    expect(href).toContain("%2Fauth%2Faccept-invite%2Finvite-token-123");
    expect(href).toContain("email=invited%40example.com");
  });

  test("covers phone entry, OTP, change-number, resend, and details states", async ({ page }) => {
    await page.route("**/api/auth/signup-phone/start", async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    });
    await page.route("**/api/auth/signup-phone/verify", async (route) => {
      const body = route.request().postDataJSON() as { action?: string };
      if (body.action === "verify") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            verified: true,
            verification_ticket: "signed-ticket-for-browser-test",
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, redirect: "/auth/login?notice=account_created" }),
      });
    });

    await page.goto("/auth/signup-phone?email=invited%40example.com&next=%2Fonboarding");
    const phone = page.getByLabel("Phone number");
    await phone.fill("+998901234567");
    await page.getByRole("button", { name: "Send code" }).click();

    const otp = page.getByLabel("Verification code");
    await expect(otp).toBeVisible();
    await expect(page.getByText(/resend in/i)).toBeVisible();
    await page.getByRole("button", { name: /change number/i }).click();
    await expect(phone).toHaveValue("901234567");

    await page.getByRole("button", { name: "Send code" }).click();
    await otp.fill("123456");
    await page.getByRole("button", { name: "Verify", exact: true }).click();

    await expect(page.getByText("Phone verified")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveValue("invited@example.com");
    await expect(page.getByLabel("Email")).toHaveAttribute("readonly", "");
    await page.getByLabel("Full name").fill("Invite User");
    await page.getByRole("button", { name: /complete sign-up/i }).click();
    await expect(page).toHaveURL(/\/auth\/login\?notice=account_created/);
  });

  test("is responsive without horizontal overflow and keeps controls keyboard reachable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auth/login");

    await expect(page.getByText("Welcome back.")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);

    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.locator(":focus")).toBeVisible();
  });
});

test.describe("Onboarding account flow", () => {
  test.skip(!hasSupabase, "Requires Supabase credentials");

  test("creates a company with the selected candidate language", async ({ page }) => {
    const admin = getAdminClient();
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const email = `onboarding-${unique}@test.hrats.local`;
    const password = "TestPassword123!";
    const companyName = `Account Flow ${unique}`;
    let userId: string | undefined;
    let companyId: string | undefined;

    try {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Onboarding Test" },
      });
      expect(error).toBeNull();
      userId = data.user?.id;
      await admin.from("profiles").update({ locale: "en" }).eq("id", userId!);

      await page.goto("/auth/login");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password").fill(password);
      await page.getByRole("button", { name: "Sign in", exact: true }).click();
      await page.waitForURL(/\/onboarding/, { timeout: 15_000 });

      await expect(page.getByRole("heading", { name: "Welcome!" })).toBeVisible();
      await page.getByRole("button", { name: /create company/i }).click();
      await expect(page).toHaveURL(/\/onboarding\/create/);
      await page.getByLabel("Company name").fill(companyName);
      await page.getByLabel("Default language").click();
      await page.getByRole("option", { name: "English" }).click();
      await page.getByRole("button", { name: "Create company", exact: true }).click();
      await page.waitForURL(/\/hr\/dashboard/, { timeout: 15_000 });

      const { data: company } = await admin
        .from("companies")
        .select("id, default_locale")
        .eq("name", companyName)
        .single();
      expect(company?.default_locale).toBe("en");
      companyId = company?.id;

      const { data: subscription } = await admin
        .from("subscriptions")
        .select("status, trial_ends_at")
        .eq("company_id", companyId!)
        .single();
      expect(subscription?.status).toBe("trialing");
      const trialDays =
        (new Date(subscription!.trial_ends_at).getTime() - Date.now()) / (24 * 60 * 60 * 1000);
      const { data: configuredTrial } = await admin
        .from("platform_settings")
        .select("value")
        .eq("key", "trial_length_days")
        .maybeSingle();
      const expectedTrialDays = Number(configuredTrial?.value ?? 14);
      expect(trialDays).toBeGreaterThan(expectedTrialDays - 1);
      expect(trialDays).toBeLessThanOrEqual(expectedTrialDays + 0.1);
    } finally {
      if (companyId) await admin.from("companies").delete().eq("id", companyId);
      if (userId) await admin.auth.admin.deleteUser(userId).catch(() => undefined);
    }
  });
});
