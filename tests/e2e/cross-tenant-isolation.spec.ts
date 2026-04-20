import { test, expect, type BrowserContext } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cross-tenant isolation.
 *
 * Two companies, two owners, two browser contexts. We verify that neither
 * owner can see the other company's job postings or candidates:
 *   (a) through the UI — the /hr/jobs list and /hr/dashboard only show
 *       the caller's own company;
 *   (b) through direct API calls — hitting another company's resource by
 *       ID returns 404, not 200 with data;
 *   (c) through the Realtime channel (applicants page) — a candidate
 *       inserted into company B's job does NOT appear in company A's
 *       open applicants view.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE);

type Seed = {
  userId: string;
  email: string;
  password: string;
  companyId: string;
  companyName: string;
  jobId: string;
  jobTitle: string;
};

async function seedTenant(admin: SupabaseClient, tag: string): Promise<Seed> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `e2e-tenant-${tag}-${unique}@test.hrats.local`;
  const password = "TestPassword123!";
  const companyName = `Tenant ${tag.toUpperCase()} ${unique}`;
  const slug = `tenant-${tag}-${unique}`.toLowerCase();
  const jobTitle = `${tag.toUpperCase()} Secret Job ${unique}`;

  // 1. Create auth user (email confirmed so login works immediately).
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Owner ${tag.toUpperCase()}` },
  });
  if (createErr || !created.user) throw new Error(`createUser failed: ${createErr?.message}`);
  const userId = created.user.id;

  // 2. Company + owner membership + subscription + current_company_id.
  const { data: company, error: coErr } = await admin
    .from("companies")
    .insert({ name: companyName, slug, default_locale: "ru" })
    .select("id")
    .single();
  if (coErr || !company) throw new Error(`company insert failed: ${coErr?.message}`);

  const { error: memErr } = await admin
    .from("company_members")
    .insert({ company_id: company.id, user_id: userId, role: "owner" });
  if (memErr) throw new Error(`member insert failed: ${memErr.message}`);

  await admin.from("subscriptions").insert({ company_id: company.id });

  await admin.from("profiles").update({ current_company_id: company.id }).eq("id", userId);

  // 3. One job posting.
  const { data: job, error: jobErr } = await admin
    .from("job_postings")
    .insert({
      company_id: company.id,
      title: jobTitle,
      description:
        "This is a company-scoped E2E tenancy test posting that must never leak across tenants.",
      required_skills: ["IsolationTest"],
      hard_requirements: [],
      status: "active",
      created_by: userId,
    })
    .select("id")
    .single();
  if (jobErr || !job) throw new Error(`job insert failed: ${jobErr?.message}`);

  return {
    userId,
    email,
    password,
    companyId: company.id,
    companyName,
    jobId: job.id,
    jobTitle,
  };
}

async function tearDown(admin: SupabaseClient, seed: Seed) {
  // Deleting the user cascades through profiles → company_members (owner),
  // and we also drop the company explicitly to remove jobs/candidates.
  await admin.from("companies").delete().eq("id", seed.companyId);
  await admin.auth.admin.deleteUser(seed.userId).catch(() => undefined);
}

async function signInAs(ctx: BrowserContext, email: string, password: string) {
  const page = await ctx.newPage();
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/hr\/dashboard|\/onboarding/, { timeout: 10_000 });
  return page;
}

test.describe("Cross-tenant isolation", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  let admin: SupabaseClient;
  let tenantA: Seed;
  let tenantB: Seed;

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    tenantA = await seedTenant(admin, "a");
    tenantB = await seedTenant(admin, "b");
  });

  test.afterAll(async () => {
    if (tenantA) await tearDown(admin, tenantA);
    if (tenantB) await tearDown(admin, tenantB);
  });

  test("each owner sees only their own company in /hr/jobs", async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();

    try {
      const pageA = await signInAs(ctxA, tenantA.email, tenantA.password);
      const pageB = await signInAs(ctxB, tenantB.email, tenantB.password);

      await pageA.goto("/hr/jobs");
      await expect(pageA.getByText(tenantA.jobTitle)).toBeVisible({ timeout: 15000 });
      await expect(pageA.getByText(tenantB.jobTitle)).toHaveCount(0);

      await pageB.goto("/hr/jobs");
      await expect(pageB.getByText(tenantB.jobTitle)).toBeVisible({ timeout: 15000 });
      await expect(pageB.getByText(tenantA.jobTitle)).toHaveCount(0);
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });

  test("direct API calls cannot reach another company's resources", async ({ browser }) => {
    const ctxA = await browser.newContext();
    try {
      await signInAs(ctxA, tenantA.email, tenantA.password);

      // A tries to read B's job detail via the HR link API → not 200
      const linkRes = await ctxA.request.get(`/api/hr/jobs/${tenantB.jobId}/link`);
      expect(linkRes.ok()).toBe(false);
      expect(linkRes.status()).toBeGreaterThanOrEqual(400);

      // A tries to list applicants on B's job → not 200
      const applicantsRes = await ctxA.request.get(`/api/hr/jobs/${tenantB.jobId}/applicants`);
      expect(applicantsRes.ok()).toBe(false);
      expect(applicantsRes.status()).toBeGreaterThanOrEqual(400);

      // A tries to patch B's job status → not 200
      const statusRes = await ctxA.request.patch(`/api/hr/jobs/${tenantB.jobId}/status`, {
        data: { status: "closed" },
      });
      expect(statusRes.ok()).toBe(false);
      expect(statusRes.status()).toBeGreaterThanOrEqual(400);

      // A tries to update B's job content → not 200
      const updateRes = await ctxA.request.patch(`/api/hr/jobs/${tenantB.jobId}`, {
        data: {
          title: "Hijacked",
          description:
            "This update must be rejected by the company scope guard before it touches the DB.",
          required_skills: [],
          hard_requirements: [],
          status: "active",
        },
      });
      expect(updateRes.ok()).toBe(false);
      expect(updateRes.status()).toBeGreaterThanOrEqual(400);

      // Sanity check: Tenant B's job still untouched.
      const { data: stillB } = await admin
        .from("job_postings")
        .select("title, status")
        .eq("id", tenantB.jobId)
        .single();
      expect(stillB?.title).toBe(tenantB.jobTitle);
      expect(stillB?.status).toBe("active");
    } finally {
      await ctxA.close();
    }
  });

  test("candidate inserted into company B does NOT appear in company A's applicants view", async ({
    browser,
  }) => {
    const ctxA = await browser.newContext();
    try {
      const pageA = await signInAs(ctxA, tenantA.email, tenantA.password);

      // A opens its OWN job's applicants page (not B's) to confirm RLS + channel
      // filter keeps B's candidates off of A's screen.
      await pageA.goto(`/hr/jobs/${tenantA.jobId}/applicants`);
      await expect(pageA.getByText(tenantA.jobTitle)).toBeVisible({ timeout: 15000 });

      const leakName = `Leak Candidate ${Date.now()}`;

      // Insert a candidate directly into B's job via service role.
      const { error: insertErr } = await admin.from("candidates").insert({
        job_posting_id: tenantB.jobId,
        full_name: leakName,
        phone_number: "+998900000001",
        status: "analyzed",
        match_score: 90,
        one_line_summary: "Should never appear on tenant A",
        strengths: ["IsolationTest"],
        gaps: [],
        language_detected: "ru",
      });
      expect(insertErr).toBeNull();

      // Wait a moment for any Realtime events to propagate.
      await pageA.waitForTimeout(3000);

      // Tenant A must NOT see the name.
      await expect(pageA.getByText(leakName)).toHaveCount(0);
    } finally {
      await ctxA.close();
    }
  });
});
