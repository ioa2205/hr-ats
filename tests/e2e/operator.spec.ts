import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Operator super-admin flow.
 *
 * Seeds one tenant (company + owner user) and one operator user, then runs
 * through: list companies → suspend (verify HR side becomes read-only) →
 * reactivate → impersonate the tenant owner (verify banner + audit entry) →
 * end session.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE);

type Tenant = {
  userId: string;
  email: string;
  password: string;
  companyId: string;
  companyName: string;
};

type Operator = {
  userId: string;
  email: string;
  password: string;
};

async function seedTenant(admin: SupabaseClient): Promise<Tenant> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `e2e-op-tenant-${unique}@test.hrats.local`;
  const password = "TestPassword123!";
  const companyName = `Op Tenant ${unique}`;
  const slug = `op-tenant-${unique}`.toLowerCase();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Owner ${unique}` },
  });
  if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);
  const userId = created.user.id;

  const { data: company, error: coErr } = await admin
    .from("companies")
    .insert({ name: companyName, slug, default_locale: "ru" })
    .select("id")
    .single();
  if (coErr || !company) throw new Error(`company insert failed: ${coErr?.message}`);

  await admin
    .from("company_members")
    .insert({ company_id: company.id, user_id: userId, role: "owner" });
  await admin.from("subscriptions").insert({ company_id: company.id });
  await admin.from("profiles").update({ current_company_id: company.id }).eq("id", userId);

  return { userId, email, password, companyId: company.id, companyName };
}

async function seedOperator(admin: SupabaseClient): Promise<Operator> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `e2e-op-${unique}@test.hrats.local`;
  const password = "TestPassword123!";

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Operator ${unique}` },
  });
  if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);
  const userId = created.user.id;

  // Flip is_operator — the trigger mirrors it into raw_app_meta_data.
  await admin.from("profiles").update({ is_operator: true }).eq("id", userId);

  return { userId, email, password };
}

async function teardownTenant(admin: SupabaseClient, t: Tenant) {
  await admin.from("companies").delete().eq("id", t.companyId);
  await admin.auth.admin.deleteUser(t.userId).catch(() => undefined);
}

async function teardownOperator(admin: SupabaseClient, o: Operator) {
  await admin.auth.admin.deleteUser(o.userId).catch(() => undefined);
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

test.describe("Operator panel", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  let admin: SupabaseClient;
  let tenant: Tenant;
  let operator: Operator;

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    tenant = await seedTenant(admin);
    operator = await seedOperator(admin);
  });

  test.afterAll(async () => {
    if (tenant) await teardownTenant(admin, tenant);
    if (operator) await teardownOperator(admin, operator);
  });

  test("operator lists companies and can see the seeded tenant", async ({ browser }) => {
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();
      await signIn(page, operator.email, operator.password);
      await page.waitForURL(/\/operator|\/hr|\/onboarding/, { timeout: 15_000 });

      await page.goto("/operator/companies");
      await expect(page.getByText(tenant.companyName)).toBeVisible({ timeout: 15_000 });
    } finally {
      await ctx.close();
    }
  });

  test("suspending a company makes HR side read-only", async ({ browser }) => {
    // 1. Operator suspends the company via the API.
    const opCtx: BrowserContext = await browser.newContext();
    try {
      const opPage = await opCtx.newPage();
      await signIn(opPage, operator.email, operator.password);
      await opPage.waitForURL(/\/operator|\/hr/, { timeout: 15_000 });

      const suspendRes = await opCtx.request.post(
        `/api/operator/companies/${tenant.companyId}/suspend`,
      );
      expect(suspendRes.ok()).toBe(true);

      // 2. HR owner tries to mutate — should be blocked (subscription_inactive).
      const hrCtx = await browser.newContext();
      try {
        const hrPage = await hrCtx.newPage();
        await signIn(hrPage, tenant.email, tenant.password);
        await hrPage.waitForURL(/\/hr\/dashboard/, { timeout: 15_000 });

        const createRes = await hrCtx.request.post(`/api/hr/jobs`, {
          data: {
            title: "Should not be created",
            description: "Long enough description to pass validation " + "x".repeat(40),
            required_skills: ["T"],
            hard_requirements: [],
            status: "active",
          },
        });
        expect(createRes.status()).toBe(403);
        const body = await createRes.json().catch(() => ({}));
        expect(body.error).toBe("subscription_inactive");
      } finally {
        await hrCtx.close();
      }

      // 3. Reactivate for follow-up tests.
      const activateRes = await opCtx.request.post(
        `/api/operator/companies/${tenant.companyId}/activate`,
      );
      expect(activateRes.ok()).toBe(true);
    } finally {
      await opCtx.close();
    }
  });

  test("operator impersonates a user — banner shows, audit row written, end session works", async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();
      await signIn(page, operator.email, operator.password);
      await page.waitForURL(/\/operator|\/hr/, { timeout: 15_000 });

      const startRes = await ctx.request.post("/api/operator/impersonate/start", {
        data: { targetUserId: tenant.userId, reason: "e2e-operator-spec" },
      });
      expect(startRes.ok()).toBe(true);
      const startJson = await startRes.json();
      expect(startJson.sessionId).toBeTruthy();
      expect(startJson.signInUrl).toMatch(/\/auth\/callback\?/);

      // Audit: "impersonation.started" row with both operator and target IDs.
      const { data: auditStart } = await admin
        .from("audit_log")
        .select("actor_user_id, action, entity_id, metadata")
        .eq("action", "impersonation.started")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      expect(auditStart?.actor_user_id).toBe(operator.userId);
      expect(auditStart?.entity_id).toBe(tenant.userId);
      const meta = auditStart?.metadata as Record<string, unknown> | null;
      expect(meta?.operator_id).toBe(operator.userId);
      expect(meta?.target_user_id).toBe(tenant.userId);

      // Follow the magic-link URL to land in the impersonated session.
      await page.goto(startJson.signInUrl);
      await page.waitForURL(/\/hr|\/onboarding/, { timeout: 15_000 });

      // Banner visible on any authenticated page.
      await expect(page.getByTestId("impersonation-banner")).toBeVisible({ timeout: 10_000 });
      // Banner shows full_name when present, falling back to email — match either.
      const { data: targetProfile } = await admin
        .from("profiles")
        .select("full_name, email")
        .eq("id", tenant.userId)
        .single();
      const expectedLabel = targetProfile?.full_name || targetProfile?.email || tenant.email;
      await expect(page.getByTestId("impersonation-banner")).toContainText(expectedLabel);

      // End session.
      const endRes = await ctx.request.post("/api/operator/impersonate/end");
      expect(endRes.ok()).toBe(true);

      const { data: auditEnd } = await admin
        .from("audit_log")
        .select("actor_user_id, action, entity_id, metadata")
        .eq("action", "impersonation.ended")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      expect(auditEnd?.actor_user_id).toBe(operator.userId);
      expect(auditEnd?.entity_id).toBe(tenant.userId);

      // The session row is closed.
      const { data: session } = await admin
        .from("impersonation_sessions")
        .select("ended_at")
        .eq("id", startJson.sessionId)
        .single();
      expect(session?.ended_at).not.toBeNull();
    } finally {
      await ctx.close();
    }
  });

  test("non-operator user is redirected away from /operator", async ({ browser }) => {
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();
      await signIn(page, tenant.email, tenant.password);
      await page.waitForURL(/\/hr\/dashboard/, { timeout: 15_000 });

      await page.goto("/operator");
      await page.waitForURL(/\/hr\/dashboard/, { timeout: 15_000 });
      expect(page.url()).toMatch(/\/hr\/dashboard/);
    } finally {
      await ctx.close();
    }
  });
});
