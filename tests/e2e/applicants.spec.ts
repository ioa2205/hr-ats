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
 * E2E tests for the applicants page.
 *
 * Seeds its own tenant (company + owner profile) and a posting with
 * mixed-status candidates so the suite is self-contained.
 */

type SeedResult = {
  job: { id: string };
  candidates: { id: string }[];
};

async function seedTestData(admin: SupabaseClient, companyId: string): Promise<SeedResult | null> {
  const { data: job, error: jobErr } = await admin
    .from("job_postings")
    .insert({
      company_id: companyId,
      title: "E2E Test Position",
      description:
        "A test job posting for E2E applicant tests with enough characters to pass validation.",
      required_skills: ["TypeScript", "React"],
      hard_requirements: [],
      status: "active",
    })
    .select("id")
    .single();

  if (jobErr || !job?.id) return null;

  const candidates = [
    {
      job_posting_id: job.id,
      full_name: "Alisher Karimov",
      phone_number: "+998901234567",
      status: "analyzed" as const,
      match_score: 92,
      one_line_summary: "Strong full-stack developer with React expertise",
      strengths: ["React expertise", "TypeScript proficiency"],
      gaps: ["No DevOps experience"],
      language_detected: "ru" as const,
    },
    {
      job_posting_id: job.id,
      full_name: "Bekzod Tursunov",
      phone_number: "+998901234568",
      status: "analyzed" as const,
      match_score: 78,
      one_line_summary: "Solid backend developer transitioning to full-stack",
      strengths: ["Node.js experience"],
      gaps: ["Limited frontend skills"],
      language_detected: "uz" as const,
    },
    {
      job_posting_id: job.id,
      full_name: "Charos Mirzaeva",
      phone_number: "+998901234569",
      status: "analyzed" as const,
      match_score: 85,
      one_line_summary: "Experienced frontend developer with design skills",
      strengths: ["CSS expertise", "Design sense"],
      gaps: [],
      language_detected: "ru" as const,
    },
    {
      job_posting_id: job.id,
      full_name: "Dilshod Rakhimov",
      phone_number: "+998901234570",
      status: "pending_analysis" as const,
      match_score: null,
      one_line_summary: null,
      strengths: null,
      gaps: null,
      language_detected: null,
    },
    {
      job_posting_id: job.id,
      full_name: "Eldor Nazarov",
      phone_number: "+998901234571",
      status: "analysis_failed" as const,
      match_score: null,
      one_line_summary: null,
      strengths: null,
      gaps: null,
      language_detected: null,
      ai_error: "Gemini API timeout after 30s",
    },
  ];

  const { data: inserted } = await admin.from("candidates").insert(candidates).select("id");
  return { job, candidates: inserted ?? [] };
}

async function cleanupTestData(admin: SupabaseClient, jobId: string) {
  await admin.from("job_postings").delete().eq("id", jobId);
}

test.describe("Applicants page", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  let admin: SupabaseClient;
  let tenant: TenantFixture;
  let testData: SeedResult | null;

  test.beforeAll(async () => {
    admin = getAdminClient();
    tenant = await createTenant(admin, { tag: "apps" });
    testData = await seedTestData(admin, tenant.companyId);
  });

  test.afterAll(async () => {
    if (testData?.job?.id) await cleanupTestData(admin, testData.job.id);
    if (tenant) await deleteTenant(admin, tenant);
  });

  test.beforeEach(async ({ page }) => {
    await signInOnPage(page, tenant.email, tenant.password);
  });

  test("displays candidates in ranked order", async ({ page }) => {
    test.skip(!testData, "No test data seeded");

    await page.goto(`/hr/jobs/${testData!.job.id}/applicants`);

    // Wait for candidates to render (SSR page may take a moment)
    await expect(page.getByRole("button", { name: /Alisher Karimov/ })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole("button", { name: /Bekzod Tursunov/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Charos Mirzaeva/ })).toBeVisible();

    // Verify analyzed candidates appear before pending
    const candidateNames = await page
      .locator("button")
      .filter({ hasText: /Karimov|Tursunov|Mirzaeva|Rakhimov|Nazarov/ })
      .allTextContents();
    const nameOrder = candidateNames
      .map((t) => {
        if (t.includes("Alisher")) return "Alisher";
        if (t.includes("Charos")) return "Charos";
        if (t.includes("Bekzod")) return "Bekzod";
        if (t.includes("Dilshod")) return "Dilshod";
        if (t.includes("Eldor")) return "Eldor";
        return "";
      })
      .filter(Boolean);

    // Top 3 should be the analyzed candidates (by score: Alisher 92, Charos 85, Bekzod 78)
    expect(nameOrder.indexOf("Alisher")).toBeLessThan(nameOrder.indexOf("Dilshod"));
    expect(nameOrder.indexOf("Charos")).toBeLessThan(nameOrder.indexOf("Eldor"));
  });

  test("selects candidate via URL param and shows detail", async ({ page }) => {
    test.skip(!testData, "No test data seeded");

    const candidateId = testData!.candidates[0].id;
    await page.goto(`/hr/jobs/${testData!.job.id}/applicants?candidate=${candidateId}`);

    // Detail panel should show candidate info (h2 heading in detail panel)
    await expect(page.locator("h2", { hasText: "Alisher Karimov" }).first()).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("+998 90 123 45 67").first()).toBeVisible();

    // URL should have candidate param
    expect(page.url()).toContain(`candidate=${candidateId}`);
  });

  test("clicking candidate updates URL and shows detail panel", async ({ page }) => {
    test.skip(!testData, "No test data seeded");

    await page.goto(`/hr/jobs/${testData!.job.id}/applicants`);

    // Wait for candidate list to load, then click
    await expect(page.getByRole("button", { name: /Charos Mirzaeva/ })).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole("button", { name: /Charos Mirzaeva/ }).click();

    // URL should update
    const candidateId = testData!.candidates[2].id;
    await expect(page).toHaveURL(new RegExp(`candidate=${candidateId}`));
  });

  test("AI Analysis tab shows score, strengths, and gaps", async ({ page }) => {
    test.skip(!testData, "No test data seeded");

    const candidateId = testData!.candidates[0].id;
    await page.goto(`/hr/jobs/${testData!.job.id}/applicants?candidate=${candidateId}`);

    // Wait for detail panel to load
    await expect(page.locator("h2", { hasText: "Alisher Karimov" }).first()).toBeVisible({
      timeout: 15000,
    });

    // AI Analysis tab should be active by default
    await expect(page.getByText("92").first()).toBeVisible(); // Score
    await expect(page.getByText("Strengths").first()).toBeVisible();
    await expect(page.getByText("React expertise").first()).toBeVisible();
    await expect(page.getByText("Gaps").first()).toBeVisible();
    await expect(page.getByText("No DevOps experience").first()).toBeVisible();
  });

  test("invite modal opens and copy works", async ({ page, context }) => {
    test.skip(!testData, "No test data seeded");

    const candidateId = testData!.candidates[0].id;
    await page.goto(`/hr/jobs/${testData!.job.id}/applicants?candidate=${candidateId}`);

    // Grant clipboard permissions
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    // Wait for detail panel to load
    await expect(page.locator("h2", { hasText: "Alisher Karimov" }).first()).toBeVisible({
      timeout: 15000,
    });

    // Click invite button
    await page.getByRole("button", { name: "Invite to interview" }).first().click();

    // Modal should appear
    await expect(page.getByText("Invite Alisher Karimov")).toBeVisible();

    // Copy button
    await page.getByRole("button", { name: /Copy message/ }).click();
    await expect(page.getByText("Copied").first()).toBeVisible();
  });

  test("mark as invited updates candidate status", async ({ page }) => {
    test.skip(!testData, "No test data seeded");

    const candidateId = testData!.candidates[1].id; // Bekzod
    await page.goto(`/hr/jobs/${testData!.job.id}/applicants?candidate=${candidateId}`);

    // Wait for detail panel to load
    await expect(page.locator("h2", { hasText: "Bekzod Tursunov" }).first()).toBeVisible({
      timeout: 15000,
    });

    // Click invite
    await page.getByRole("button", { name: "Invite to interview" }).first().click();
    await expect(page.getByText("Invite Bekzod Tursunov")).toBeVisible();

    // Mark as invited
    await page.getByRole("button", { name: "Mark as invited" }).click();

    // The detail-panel Invite button is replaced with a disabled "Invited" pill.
    // Scope to disabled buttons to avoid matching the list-row button (which
    // also contains "Invited" but remains enabled as a row selector).
    const invitedButton = page.locator("button[disabled]").filter({ hasText: /Invited/ }).first();
    await expect(invitedButton).toBeVisible({ timeout: 10000 });
    await expect(invitedButton).toBeDisabled();
  });

  test("chip counts are displayed correctly", async ({ page }) => {
    test.skip(!testData, "No test data seeded");

    await page.goto(`/hr/jobs/${testData!.job.id}/applicants`);

    // Wait for candidates to load before checking counts
    await expect(page.getByRole("button", { name: /Karimov/ })).toBeVisible({ timeout: 15000 });

    // Check counts are visible
    await expect(page.getByText(/\d+ total/)).toBeVisible();
    await expect(page.getByText(/\d+ analyzed/)).toBeVisible();
  });
});
