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

/**
 * P7 trial enforcement.
 *
 * Seeds a tenant whose subscription has expired (trial_ends_at in the past +
 * status='expired') and verifies that:
 *  1. Every /api/hr/* mutation returns 403 with `error: 'subscription_inactive'`.
 *  2. Read-only routes (GET) still work.
 *  3. The /api/hr/quota endpoint reports `can_write: false`.
 *  4. Visiting /hr/jobs/new redirects to /hr/settings/billing.
 */
test.describe("Trial expiry — read-only mode", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  let admin: SupabaseClient;
  let tenant: TenantFixture;
  let jobId: string;

  test.beforeAll(async () => {
    admin = getAdminClient();
    tenant = await createTenant(admin, { tag: "expired" });

    // Force-expire the subscription: trial_ends_at in the past + status='expired'.
    await admin
      .from("subscriptions")
      .update({
        status: "expired",
        trial_ends_at: new Date(Date.now() - 86400_000).toISOString(),
      })
      .eq("company_id", tenant.companyId);

    // Create a job so we have something to mutate against.
    const { data: job, error } = await admin
      .from("job_postings")
      .insert({
        company_id: tenant.companyId,
        title: "Existing job for expired-trial test",
        description:
          "This job was created before the trial expired. It is used to verify mutation gates.",
        required_skills: [],
        hard_requirements: [],
        status: "active",
        created_by: tenant.userId,
      })
      .select("id")
      .single();
    if (error || !job) throw new Error(`job seed failed: ${error?.message}`);
    jobId = job.id;
  });

  test.afterAll(async () => {
    if (tenant) await deleteTenant(admin, tenant);
  });

  test.beforeEach(async ({ page }) => {
    await signInOnPage(page, tenant.email, tenant.password);
  });

  test("GET /api/hr/quota reports can_write=false and status=expired", async ({ page }) => {
    const res = await page.request.get("/api/hr/quota");
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as { status: string; can_write: boolean };
    expect(body.status).toBe("expired");
    expect(body.can_write).toBe(false);
  });

  test("POST /api/hr/jobs returns 403 subscription_inactive", async ({ page }) => {
    const res = await page.request.post("/api/hr/jobs", {
      data: {
        title: "Should be blocked",
        description: "An expired trial must not be able to create new jobs at all.",
        required_skills: [],
        hard_requirements: [],
        status: "active",
      },
    });
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("subscription_inactive");
  });

  test("PATCH /api/hr/jobs/:id returns 403 subscription_inactive", async ({ page }) => {
    const res = await page.request.patch(`/api/hr/jobs/${jobId}`, {
      data: {
        title: "Updated by expired tenant",
        description: "This update must be rejected with 403 subscription_inactive.",
        required_skills: [],
        hard_requirements: [],
        status: "active",
      },
    });
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("subscription_inactive");
  });

  test("PATCH /api/hr/jobs/:id/status returns 403 subscription_inactive", async ({ page }) => {
    const res = await page.request.patch(`/api/hr/jobs/${jobId}/status`, {
      data: { status: "closed" },
    });
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("subscription_inactive");
  });

  test("POST /api/hr/team/invite returns 403 subscription_inactive", async ({ page }) => {
    const res = await page.request.post("/api/hr/team/invite", {
      data: { email: `blocked-${Date.now()}@test.hrats.local`, role: "recruiter" },
    });
    expect(res.status()).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("subscription_inactive");
  });

  test("/hr/jobs/new redirects to /hr/settings/billing", async ({ page }) => {
    await page.goto("/hr/jobs/new");
    await page.waitForURL(/\/hr\/settings\/billing/, { timeout: 10_000 });
    expect(page.url()).toContain("/hr/settings/billing");
  });

  test("read-only banner renders 'Read-only' on the dashboard", async ({ page }) => {
    await page.goto("/hr/dashboard");
    // QuotaBanner uses the i18n key quota.readonly_title — match RU/UZ/EN.
    await expect(page.getByText(/Режим чтения|Faqat o.qish rejimi|Read-only mode/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
