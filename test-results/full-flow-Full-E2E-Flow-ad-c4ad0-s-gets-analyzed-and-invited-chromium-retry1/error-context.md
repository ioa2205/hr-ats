# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: full-flow.spec.ts >> Full E2E Flow >> admin creates posting, candidate applies, gets analyzed and invited
- Location: tests\e2e\full-flow.spec.ts:38:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('E2E Test Position 1776438789010')
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByText('E2E Test Position 1776438789010')

```

# Test source

```ts
  1   | import { test, expect } from "@playwright/test";
  2   | import path from "node:path";
  3   | import {
  4   |   createTenant,
  5   |   deleteTenant,
  6   |   getAdminClient,
  7   |   hasSupabase,
  8   |   signInOnPage,
  9   |   type TenantFixture,
  10  | } from "./utils/tenant";
  11  | import type { SupabaseClient } from "@supabase/supabase-js";
  12  | 
  13  | /**
  14  |  * Full E2E happy path:
  15  |  * 1. HR owner (seeded tenant) signs in
  16  |  * 2. Creates posting with 2 hard requirements
  17  |  * 3. Opens public apply link in new context
  18  |  * 4. Candidate submits CV (uses fixture PDF)
  19  |  * 5. Wait for candidate to appear as "analyzed" (mock Gemini returns quickly)
  20  |  * 6. Back in admin: sees candidate analyzed with score
  21  |  * 7. Opens detail, marks as invited
  22  |  */
  23  | test.describe("Full E2E Flow", () => {
  24  |   test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  25  | 
  26  |   let admin: SupabaseClient;
  27  |   let tenant: TenantFixture;
  28  | 
  29  |   test.beforeAll(async () => {
  30  |     admin = getAdminClient();
  31  |     tenant = await createTenant(admin, { tag: "flow" });
  32  |   });
  33  | 
  34  |   test.afterAll(async () => {
  35  |     if (tenant) await deleteTenant(admin, tenant);
  36  |   });
  37  | 
  38  |   test("admin creates posting, candidate applies, gets analyzed and invited", async ({
  39  |     page,
  40  |     context,
  41  |   }) => {
  42  |     // ── 1. Sign in as HR ─────────────────────────────────────────────
  43  |     await signInOnPage(page, tenant.email, tenant.password);
  44  | 
  45  |     // ── 2. Create posting with 2 hard requirements ───────────────────
  46  |     await page.goto("/hr/jobs/new");
  47  |     await expect(page.getByRole("heading", { name: "Создать вакансию" })).toBeVisible();
  48  | 
  49  |     const uniqueTitle = `E2E Test Position ${Date.now()}`;
  50  |     await page.getByLabel("Название вакансии").fill(uniqueTitle);
  51  |     await page
  52  |       .locator("textarea#description")
  53  |       .fill(
  54  |         "Full-stack developer position. Requires experience with TypeScript and React. Must have strong communication skills.",
  55  |       );
  56  | 
  57  |     // Skills
  58  |     const skillInput = page.getByLabel("Необходимые навыки");
  59  |     await skillInput.fill("TypeScript");
  60  |     await skillInput.press("Enter");
  61  |     await skillInput.fill("React");
  62  |     await skillInput.press("Enter");
  63  | 
  64  |     // First hard requirement (boolean)
  65  |     await page.getByRole("button", { name: /добавить требование/i }).click();
  66  |     const firstReq = page.getByTestId("hard-req-row").first();
  67  |     await firstReq.getByPlaceholder("Название (рус)").fill("Высшее образование");
  68  |     await firstReq.getByPlaceholder("Название (узб)").fill("Oliy malumot");
  69  | 
  70  |     // Second hard requirement (number)
  71  |     await page.getByRole("button", { name: /добавить требование/i }).click();
  72  |     const secondReq = page.getByTestId("hard-req-row").nth(1);
  73  |     await secondReq.getByPlaceholder("Название (рус)").fill("Опыт работы (лет)");
  74  |     await secondReq.getByPlaceholder("Название (узб)").fill("Ish tajribasi (yil)");
  75  |     await secondReq.locator("button[role=combobox]").click();
  76  |     await page.getByRole("option", { name: "Мин. число" }).click();
  77  |     await secondReq.getByPlaceholder("Мин.").fill("1");
  78  | 
  79  |     // Submit
  80  |     await page.getByRole("button", { name: /создать вакансию/i }).click();
  81  |     await page.waitForURL("/hr/jobs*");
> 82  |     await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 15000 });
      |                                               ^ Error: expect(locator).toBeVisible() failed
  83  | 
  84  |     // Navigate to job detail to get public link
  85  |     await page.getByText(uniqueTitle).click();
  86  |     await page.waitForURL(/\/hr\/jobs\/.+/);
  87  | 
  88  |     const linkInput = page.locator("input[readonly]");
  89  |     const publicUrl = await linkInput.inputValue();
  90  |     expect(publicUrl).toContain("/apply/");
  91  | 
  92  |     // ── 3. Open public apply link in new context ─────────────────────
  93  |     const candidatePage = await context.newPage();
  94  |     await candidatePage.goto(publicUrl);
  95  |     await expect(candidatePage.getByText(/подать заявку|ariza topshirish/i)).toBeVisible();
  96  | 
  97  |     // ── 4. Candidate submits CV ──────────────────────────────────────
  98  |     // Fill hard requirements
  99  |     // First req (boolean) — click "Yes"
  100 |     await candidatePage.getByRole("radio", { name: /да|ha/i }).first().click();
  101 |     // Second req (number) — fill a value >= min
  102 |     const numberInput = candidatePage.locator('input[type="number"]');
  103 |     if (await numberInput.isVisible()) {
  104 |       await numberInput.fill("3");
  105 |     }
  106 | 
  107 |     // Fill personal info
  108 |     await candidatePage.getByLabel(/полное имя|to'liq ism/i).fill("Тестовый Кандидат");
  109 |     await candidatePage.getByLabel(/номер телефона|telefon raqami/i).fill("+998901234567");
  110 | 
  111 |     // Upload fixture CV (PDF)
  112 |     const fixturePath = path.join(__dirname, "..", "fixtures", "test-cv.pdf");
  113 |     const fileInput = candidatePage.locator('input[type="file"]');
  114 |     await fileInput.setInputFiles(fixturePath);
  115 | 
  116 |     // Submit
  117 |     await candidatePage.getByRole("button", { name: /отправить|yuborish/i }).click();
  118 | 
  119 |     // Wait for success state
  120 |     await expect(candidatePage.getByText(/заявка отправлена|ariza yuborildi/i)).toBeVisible({
  121 |       timeout: 15000,
  122 |     });
  123 | 
  124 |     await candidatePage.close();
  125 | 
  126 |     // ── 5. Wait for analysis ─────────────────────────────────────────
  127 |     const jobUrl = page.url();
  128 |     const applicantsUrl = `${jobUrl}/applicants`;
  129 | 
  130 |     await page.goto(applicantsUrl);
  131 | 
  132 |     // Wait for candidate to appear (might need to refresh)
  133 |     await expect(async () => {
  134 |       await page.reload();
  135 |       await expect(page.getByText("Тестовый Кандидат")).toBeVisible();
  136 |     }).toPass({ timeout: 60000, intervals: [3000] });
  137 | 
  138 |     // ── 6. Verify candidate is visible with score ────────────────────
  139 |     await expect(page.getByText("Тестовый Кандидат")).toBeVisible();
  140 | 
  141 |     // ── 7. Open detail and mark as invited ───────────────────────────
  142 |     await page.getByText("Тестовый Кандидат").click();
  143 | 
  144 |     // Look for invite button in detail panel
  145 |     const inviteButton = page.getByRole("button", {
  146 |       name: /пригласить|taklif|invite/i,
  147 |     });
  148 |     if (await inviteButton.isVisible({ timeout: 5000 })) {
  149 |       await inviteButton.click();
  150 | 
  151 |       // Confirm invitation in modal
  152 |       const confirmButton = page.getByRole("button", {
  153 |         name: /mark as invited|пригласить|yuborish/i,
  154 |       });
  155 |       if (await confirmButton.isVisible({ timeout: 3000 })) {
  156 |         await confirmButton.click();
  157 |       }
  158 | 
  159 |       // Wait for status update
  160 |       await expect(page.getByText(/приглашён|invited/i)).toBeVisible({ timeout: 10000 });
  161 |     }
  162 |   });
  163 | });
  164 | 
```