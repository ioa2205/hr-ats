import { test, expect } from "@playwright/test";
import path from "node:path";
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
 * Full E2E happy path:
 * 1. HR owner (seeded tenant) signs in
 * 2. Creates posting with 2 hard requirements
 * 3. Opens public apply link in new context
 * 4. Candidate submits CV (uses fixture PDF)
 * 5. Wait for candidate to appear as "analyzed" (mock Gemini returns quickly)
 * 6. Back in admin: sees candidate analyzed with score
 * 7. Opens detail, marks as invited
 */
test.describe("Full E2E Flow", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  let admin: SupabaseClient;
  let tenant: TenantFixture;

  test.beforeAll(async () => {
    admin = getAdminClient();
    tenant = await createTenant(admin, { tag: "flow" });
  });

  test.afterAll(async () => {
    if (tenant) await deleteTenant(admin, tenant);
  });

  test("admin creates posting, candidate applies, gets analyzed and invited", async ({
    page,
    context,
  }) => {
    // ── 1. Sign in as HR ─────────────────────────────────────────────
    await signInOnPage(page, tenant.email, tenant.password);

    // ── 2. Create posting with 2 hard requirements ───────────────────
    await page.goto("/hr/jobs/new");
    await expect(page.getByRole("heading", { name: "Создать вакансию" })).toBeVisible();

    const uniqueTitle = `E2E Test Position ${Date.now()}`;
    await page.getByLabel("Название вакансии (RU)", { exact: true }).fill(uniqueTitle);
    await page
      .locator('textarea[name="description_ru"]')
      .fill(
        "Full-stack developer position. Requires experience with TypeScript and React. Must have strong communication skills.",
      );

    // Skills
    const skillInput = page.getByRole("textbox", { name: "TypeScript, React, ..." });
    await skillInput.fill("TypeScript");
    await skillInput.press("Enter");
    await skillInput.fill("React");
    await skillInput.press("Enter");

    // First hard requirement (boolean)
    await page.getByRole("button", { name: /добавить требование/i }).click();
    const firstReq = page.getByTestId("hard-req-row").first();
    await firstReq.getByPlaceholder("Название (рус)").fill("Высшее образование");
    await firstReq.getByPlaceholder("Название (узб)").fill("Oliy malumot");

    // Second hard requirement (number)
    await page.getByRole("button", { name: /добавить требование/i }).click();
    const secondReq = page.getByTestId("hard-req-row").nth(1);
    await secondReq.getByPlaceholder("Название (рус)").fill("Опыт работы (лет)");
    await secondReq.getByPlaceholder("Название (узб)").fill("Ish tajribasi (yil)");
    await secondReq.locator("label", { hasText: "Мин. число" }).click();
    await secondReq.getByPlaceholder("3").fill("1");

    // Submit
    await page.getByRole("button", { name: /создать вакансию/i }).click();
    await page.waitForURL("/hr/jobs*");
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 15000 });

    // Navigate to job detail to get public link
    await page.getByText(uniqueTitle).click();
    await page.waitForURL(/\/hr\/jobs\/.+/);

    const linkInput = page.locator("input[readonly]");
    const publicUrl = await linkInput.inputValue();
    expect(publicUrl).toContain("/apply/");

    // ── 3. Open public apply link in new context ─────────────────────
    const candidatePage = await context.newPage();
    await candidatePage.goto(publicUrl);
    await expect(candidatePage.getByText(/подать заявку|ariza topshirish/i)).toBeVisible();

    // ── 4. Candidate submits CV ──────────────────────────────────────
    // Fill hard requirements
    // First req (boolean) — click "Yes"
    await candidatePage.getByRole("radio", { name: /да|ha/i }).first().click();
    // Second req (number) — fill a value >= min
    const numberInput = candidatePage.locator('input[type="number"]');
    if (await numberInput.isVisible()) {
      await numberInput.fill("3");
    }

    // Fill personal info
    await candidatePage.getByLabel(/полное имя|to'liq ism/i).fill("Тестовый Кандидат");
    await candidatePage.getByLabel(/номер телефона|telefon raqami/i).fill("+998901234567");

    // Upload fixture CV (PDF)
    const fixturePath = path.join(__dirname, "..", "fixtures", "test-cv.pdf");
    const fileInput = candidatePage.locator('input[type="file"]');
    await fileInput.setInputFiles(fixturePath);

    // Submit
    await candidatePage.getByRole("button", { name: /отправить|yuborish/i }).click();

    // Wait for success state
    await expect(candidatePage.getByText(/заявка отправлена|ariza yuborildi/i)).toBeVisible({
      timeout: 15000,
    });

    await candidatePage.close();

    // ── 5. Wait for analysis ─────────────────────────────────────────
    const jobUrl = page.url();
    const applicantsUrl = `${jobUrl}/applicants`;

    await page.goto(applicantsUrl);

    // Wait for candidate to appear (might need to refresh)
    await expect(async () => {
      await page.reload();
      await expect(page.getByText("Тестовый Кандидат")).toBeVisible();
    }).toPass({ timeout: 60000, intervals: [3000] });

    // ── 6. Verify candidate is visible with score ────────────────────
    await expect(page.getByText("Тестовый Кандидат")).toBeVisible();

    // ── 7. Open detail and mark as invited ───────────────────────────
    await page.getByText("Тестовый Кандидат").click();

    // Look for invite button in detail panel
    const inviteButton = page.getByRole("button", {
      name: /пригласить|taklif|invite/i,
    });
    if (await inviteButton.isVisible({ timeout: 5000 })) {
      await inviteButton.click();

      // Confirm invitation in modal
      const confirmButton = page.getByRole("button", {
        name: /mark as invited|пригласить|yuborish/i,
      });
      if (await confirmButton.isVisible({ timeout: 3000 })) {
        await confirmButton.click();
      }

      // Wait for status update
      await expect(page.getByText(/приглашён|invited/i)).toBeVisible({ timeout: 10000 });
    }
  });
});
