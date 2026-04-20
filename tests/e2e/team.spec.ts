import { test, expect } from "@playwright/test";
import {
  createTenant,
  deleteTenant,
  getAdminClient,
  hasSupabase,
  signInOnPage,
  type TenantFixture,
} from "./utils/tenant";
import type { SupabaseClient } from "@supabase/supabase-js";

test.describe("Team Management", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  let admin: SupabaseClient;
  let tenant: TenantFixture;

  test.beforeAll(async () => {
    admin = getAdminClient();
    tenant = await createTenant(admin, { tag: "team" });
  });

  test.afterAll(async () => {
    if (tenant) await deleteTenant(admin, tenant);
  });

  test.beforeEach(async ({ page }) => {
    await signInOnPage(page, tenant.email, tenant.password);
  });

  test("owner can view team, send invite, see link, and revoke", async ({ page }) => {
    // Navigate to team settings
    await page.goto("/hr/settings/team");

    // Verify team page loads with the owner listed
    await expect(page.locator("h2", { hasText: "Team" }).first()).toBeVisible();
    await expect(page.getByText("Invite a teammate").first()).toBeVisible();
    await expect(page.getByRole("main").getByText(tenant.email).first()).toBeVisible();

    // Send an invite
    const inviteEmail = `invite-${Date.now()}@test.hrats.local`;
    await page.getByLabel("Email").fill(inviteEmail);
    await page.getByRole("button", { name: /send invite/i }).click();

    // Verify invite link appears
    await expect(page.getByText(/invite sent to/i)).toBeVisible();
    await expect(page.getByText(/accept-invite/)).toBeVisible();

    // Verify copy button works
    const copyButton = page.getByRole("button", { name: /copy/i });
    await expect(copyButton).toBeVisible();

    // Verify pending invite section appears
    await expect(page.getByText("Pending invites")).toBeVisible();
    // Email appears in both the success card and the pending list — first() is enough
    await expect(page.getByText(inviteEmail).first()).toBeVisible();

    // Revoke the invite
    const revokeButton = page.getByLabel(`Revoke invite for ${inviteEmail}`);
    await revokeButton.click();

    // Verify invite is removed from pending list
    await expect(page.getByText("Pending invites")).not.toBeVisible();
  });

  test("owner sees correct role badges", async ({ page }) => {
    await page.goto("/hr/settings/team");

    // Owner should see their own role badge (in the main content area)
    await expect(
      page.getByRole("main").locator("span.capitalize", { hasText: "owner" }),
    ).toBeVisible();

    // Owner should see "(you)" next to their name
    await expect(page.getByRole("main").getByText("(you)")).toBeVisible();
  });

  test("invite accept page shows correct info for valid invite", async ({ browser }) => {
    // Create an invite via API (directly in database for test speed)
    const inviteEmail = `accept-${Date.now()}@test.hrats.local`;
    const { data: invite } = await admin
      .from("company_invites")
      .insert({
        company_id: tenant.companyId,
        email: inviteEmail,
        role: "recruiter",
        invited_by: tenant.userId,
      })
      .select("token")
      .single();

    if (!invite) throw new Error("Failed to create test invite");

    // Visit invite link in a clean browser context (unauthenticated)
    const freshContext = await browser.newContext();
    const newPage = await freshContext.newPage();
    await newPage.goto(`/auth/accept-invite/${invite.token}`);

    // Unauthenticated user should be redirected to signup or login
    await newPage.waitForURL(/\/auth\/(signup|login)/, { timeout: 15000 });
    expect(newPage.url()).toContain(`invite=${invite.token}`);
    await newPage.close();
    await freshContext.close();

    // Clean up
    await admin.from("company_invites").delete().eq("token", invite.token);
  });

  test("accept invite page shows expired state", async ({ page }) => {
    // Create an expired invite
    const { data: invite } = await admin
      .from("company_invites")
      .insert({
        company_id: tenant.companyId,
        email: `expired-${Date.now()}@test.hrats.local`,
        role: "admin",
        invited_by: tenant.userId,
        expires_at: new Date(Date.now() - 86400000).toISOString(),
      })
      .select("token")
      .single();

    if (!invite) throw new Error("Failed to create test invite");

    await page.goto(`/auth/accept-invite/${invite.token}`);
    await expect(page.getByText("Invite expired")).toBeVisible({ timeout: 15000 });

    // Clean up
    await admin.from("company_invites").delete().eq("token", invite.token);
  });

  test("accept invite page shows invalid state for bad token", async ({ page }) => {
    await page.goto("/auth/accept-invite/00000000-0000-0000-0000-000000000000");
    await expect(page.getByText("Invalid invite")).toBeVisible({ timeout: 15000 });
  });
});
