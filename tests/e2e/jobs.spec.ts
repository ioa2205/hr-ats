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

test.describe("Job Postings", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  let admin: SupabaseClient;
  let tenant: TenantFixture;

  test.beforeAll(async () => {
    admin = getAdminClient();
    tenant = await createTenant(admin, { tag: "jobs" });
  });

  test.afterAll(async () => {
    if (tenant) await deleteTenant(admin, tenant);
  });

  test.beforeEach(async ({ page }) => {
    await signInOnPage(page, tenant.email, tenant.password);
  });

  test("create a posting with 2 hard requirements, copy link, close & reopen", async ({
    page,
    context,
  }) => {
    // Navigate to create page
    await page.goto("/hr/jobs/new");
    await expect(page.getByRole("heading", { name: "Создать вакансию" })).toBeVisible();

    // Fill in job details
    await page.getByLabel("Название вакансии").fill("QA Engineer Playwright");
    await page
      .locator("textarea#description")
      .fill("We need a talented QA engineer to ensure quality across our product.");

    // Add skills
    const skillInput = page.getByLabel("Необходимые навыки");
    await skillInput.fill("Playwright");
    await skillInput.press("Enter");
    await skillInput.fill("TypeScript");
    await skillInput.press("Enter");

    // Add first hard requirement (boolean)
    await page.getByRole("button", { name: /добавить требование/i }).click();
    const firstReqRow = page.getByTestId("hard-req-row").first();
    await firstReqRow.getByPlaceholder("Название (рус)").fill("Высшее образование");
    await firstReqRow.getByPlaceholder("Название (узб)").fill("Oliy malumot");

    // Add second hard requirement (number)
    await page.getByRole("button", { name: /добавить требование/i }).click();
    const secondReqRow = page.getByTestId("hard-req-row").nth(1);
    await secondReqRow.getByPlaceholder("Название (рус)").fill("Опыт работы (лет)");
    await secondReqRow.getByPlaceholder("Название (узб)").fill("Ish tajribasi (yil)");
    // Change type to number
    await secondReqRow.locator("button[role=combobox]").click();
    await page.getByRole("option", { name: "Мин. число" }).click();
    await secondReqRow.getByPlaceholder("Мин.").fill("2");

    // Submit form
    await page.getByRole("button", { name: /создать вакансию/i }).click();

    // Wait for redirect to jobs list. After creation, the form calls
    // router.push + router.refresh — give the RSC re-fetch a moment.
    await page.waitForURL("/hr/jobs*");
    await expect(page.getByText("QA Engineer Playwright")).toBeVisible({ timeout: 15000 });

    // Click on the posting to view details
    await page.getByText("QA Engineer Playwright").click();
    await page.waitForURL(/\/hr\/jobs\/.+/);

    // Verify details loaded
    await expect(page.getByText("Высшее образование")).toBeVisible();
    await expect(page.getByText("Опыт работы (лет)")).toBeVisible();

    // Copy public link
    const copyButton = page.getByRole("button", { name: /копировать/i });
    await copyButton.click();

    // Read the public URL from the read-only input
    const linkInput = page.locator("input[readonly]");
    const publicUrl = await linkInput.inputValue();
    expect(publicUrl).toContain("/apply/");

    // Verify public link works
    const newPage = await context.newPage();
    await newPage.goto(publicUrl);
    await expect(newPage.locator("body")).not.toContainText("Вакансия закрыта");
    await newPage.close();

    // Close posting
    await page
      .getByRole("button", { name: /закрыть/i })
      .first()
      .click();
    // Confirm in dialog
    await page.getByRole("button", { name: /^закрыть$/i }).click();
    await expect(page.getByText("Вакансия закрыта")).toBeVisible();

    // Verify public link shows closed state
    const closedPage = await context.newPage();
    await closedPage.goto(publicUrl);
    await expect(closedPage.getByText(/вакансия закрыта|vakansiya yopilgan/i)).toBeVisible();
    await closedPage.close();

    // Reopen posting
    await page.getByRole("button", { name: /открыть повторно/i }).click();
    await page.getByRole("button", { name: /^открыть$/i }).click();
    await expect(page.getByText("Активна")).toBeVisible();

    // Verify public link works again
    const reopenedPage = await context.newPage();
    await reopenedPage.goto(publicUrl);
    await expect(reopenedPage.locator("body")).not.toContainText("Вакансия закрыта");
    await reopenedPage.close();
  });
});
