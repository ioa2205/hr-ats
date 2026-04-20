# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: jobs.spec.ts >> Job Postings >> create a posting with 2 hard requirements, copy link, close & reopen
- Location: tests\e2e\jobs.spec.ts:31:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('QA Engineer Playwright')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('QA Engineer Playwright')

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import {
  3   |   createTenant,
  4   |   deleteTenant,
  5   |   getAdminClient,
  6   |   hasSupabase,
  7   |   signInOnPage,
  8   |   type TenantFixture,
  9   | } from "./utils/tenant";
  10  | import type { SupabaseClient } from "@supabase/supabase-js";
  11  | 
  12  | test.describe("Job Postings", () => {
  13  |   test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  14  | 
  15  |   let admin: SupabaseClient;
  16  |   let tenant: TenantFixture;
  17  | 
  18  |   test.beforeAll(async () => {
  19  |     admin = getAdminClient();
  20  |     tenant = await createTenant(admin, { tag: "jobs" });
  21  |   });
  22  | 
  23  |   test.afterAll(async () => {
  24  |     if (tenant) await deleteTenant(admin, tenant);
  25  |   });
  26  | 
  27  |   test.beforeEach(async ({ page }) => {
  28  |     await signInOnPage(page, tenant.email, tenant.password);
  29  |   });
  30  | 
  31  |   test("create a posting with 2 hard requirements, copy link, close & reopen", async ({
  32  |     page,
  33  |     context,
  34  |   }) => {
  35  |     // Navigate to create page
  36  |     await page.goto("/hr/jobs/new");
  37  |     await expect(page.getByRole("heading", { name: "Создать вакансию" })).toBeVisible();
  38  | 
  39  |     // Fill in job details
  40  |     await page.getByLabel("Название вакансии").fill("QA Engineer Playwright");
  41  |     await page
  42  |       .locator("textarea#description")
  43  |       .fill("We need a talented QA engineer to ensure quality across our product.");
  44  | 
  45  |     // Add skills
  46  |     const skillInput = page.getByLabel("Необходимые навыки");
  47  |     await skillInput.fill("Playwright");
  48  |     await skillInput.press("Enter");
  49  |     await skillInput.fill("TypeScript");
  50  |     await skillInput.press("Enter");
  51  | 
  52  |     // Add first hard requirement (boolean)
  53  |     await page.getByRole("button", { name: /добавить требование/i }).click();
  54  |     const firstReqRow = page.getByTestId("hard-req-row").first();
  55  |     await firstReqRow.getByPlaceholder("Название (рус)").fill("Высшее образование");
  56  |     await firstReqRow.getByPlaceholder("Название (узб)").fill("Oliy malumot");
  57  | 
  58  |     // Add second hard requirement (number)
  59  |     await page.getByRole("button", { name: /добавить требование/i }).click();
  60  |     const secondReqRow = page.getByTestId("hard-req-row").nth(1);
  61  |     await secondReqRow.getByPlaceholder("Название (рус)").fill("Опыт работы (лет)");
  62  |     await secondReqRow.getByPlaceholder("Название (узб)").fill("Ish tajribasi (yil)");
  63  |     // Change type to number
  64  |     await secondReqRow.locator("button[role=combobox]").click();
  65  |     await page.getByRole("option", { name: "Мин. число" }).click();
  66  |     await secondReqRow.getByPlaceholder("Мин.").fill("2");
  67  | 
  68  |     // Submit form
  69  |     await page.getByRole("button", { name: /создать вакансию/i }).click();
  70  | 
  71  |     // Wait for redirect to jobs list. After creation, the form calls
  72  |     // router.push + router.refresh — give the RSC re-fetch a moment.
  73  |     await page.waitForURL("/hr/jobs*");
> 74  |     await expect(page.getByText("QA Engineer Playwright")).toBeVisible({ timeout: 15000 });
      |                                                            ^ Error: expect(locator).toBeVisible() failed
  75  | 
  76  |     // Click on the posting to view details
  77  |     await page.getByText("QA Engineer Playwright").click();
  78  |     await page.waitForURL(/\/hr\/jobs\/.+/);
  79  | 
  80  |     // Verify details loaded
  81  |     await expect(page.getByText("Высшее образование")).toBeVisible();
  82  |     await expect(page.getByText("Опыт работы (лет)")).toBeVisible();
  83  | 
  84  |     // Copy public link
  85  |     const copyButton = page.getByRole("button", { name: /копировать/i });
  86  |     await copyButton.click();
  87  | 
  88  |     // Read the public URL from the read-only input
  89  |     const linkInput = page.locator("input[readonly]");
  90  |     const publicUrl = await linkInput.inputValue();
  91  |     expect(publicUrl).toContain("/apply/");
  92  | 
  93  |     // Verify public link works
  94  |     const newPage = await context.newPage();
  95  |     await newPage.goto(publicUrl);
  96  |     await expect(newPage.locator("body")).not.toContainText("Вакансия закрыта");
  97  |     await newPage.close();
  98  | 
  99  |     // Close posting
  100 |     await page
  101 |       .getByRole("button", { name: /закрыть/i })
  102 |       .first()
  103 |       .click();
  104 |     // Confirm in dialog
  105 |     await page.getByRole("button", { name: /^закрыть$/i }).click();
  106 |     await expect(page.getByText("Вакансия закрыта")).toBeVisible();
  107 | 
  108 |     // Verify public link shows closed state
  109 |     const closedPage = await context.newPage();
  110 |     await closedPage.goto(publicUrl);
  111 |     await expect(closedPage.getByText(/вакансия закрыта|vakansiya yopilgan/i)).toBeVisible();
  112 |     await closedPage.close();
  113 | 
  114 |     // Reopen posting
  115 |     await page.getByRole("button", { name: /открыть повторно/i }).click();
  116 |     await page.getByRole("button", { name: /^открыть$/i }).click();
  117 |     await expect(page.getByText("Активна")).toBeVisible();
  118 | 
  119 |     // Verify public link works again
  120 |     const reopenedPage = await context.newPage();
  121 |     await reopenedPage.goto(publicUrl);
  122 |     await expect(reopenedPage.locator("body")).not.toContainText("Вакансия закрыта");
  123 |     await reopenedPage.close();
  124 |   });
  125 | });
  126 | 
```