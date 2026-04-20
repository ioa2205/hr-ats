# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: apply.spec.ts >> Candidate Application Form >> full happy path: requirements → personal info → submit → success
- Location: tests\e2e\apply.spec.ts:106:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  101 |     // Clean up fixture
  102 |     const fixturePath = path.join(__dirname, "..", "fixtures", "test-cv.pdf");
  103 |     if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath);
  104 |   });
  105 | 
  106 |   test("full happy path: requirements → personal info → submit → success", async ({ page }) => {
  107 |     // Mock Turnstile by intercepting the script load and providing a stub
  108 |     await page.addInitScript(() => {
  109 |       (window as unknown as Record<string, unknown>).turnstile = {
  110 |         render: (_el: HTMLElement, opts: { callback: (token: string) => void }) => {
  111 |           // Immediately provide a mock token
  112 |           opts.callback("mock-turnstile-token");
  113 |         },
  114 |       };
  115 |     });
  116 | 
  117 |     // Mock the Turnstile verification on the API side by intercepting
  118 |     await page.route("**/api/apply", async (route) => {
  119 |       const request = route.request();
  120 |       if (request.method() !== "POST") {
  121 |         await route.continue();
  122 |         return;
  123 |       }
  124 | 
  125 |       // Forward to the real API but with a modified approach:
  126 |       // We'll let it go through, the API will fail turnstile check
  127 |       // unless we mock it at the API level. Instead, let's intercept
  128 |       // and return success for the E2E test.
  129 |       await route.continue();
  130 |     });
  131 | 
  132 |     await page.goto(`/apply/${testToken}`);
  133 | 
  134 |     // Step 1: Job title should be visible (SSR page, allow time)
  135 |     await expect(page.getByText("E2E Test Position")).toBeVisible({ timeout: 15000 });
  136 | 
  137 |     // Company name should also be visible (new branding)
  138 |     await expect(page.getByText(tenant.companyName)).toBeVisible();
  139 | 
  140 |     // Step 2: Requirements section visible
  141 |     await expect(page.getByText("Высшее образование")).toBeVisible();
  142 | 
  143 |     // Select "Yes" for boolean requirement — click the radio directly so
  144 |     // react-hook-form registers the "true" value, not just the label's text.
  145 |     await page
  146 |       .locator('input[type="radio"][name="requirements.has_degree"][value="true"]')
  147 |       .check({ force: true });
  148 | 
  149 |     // Fill number requirement
  150 |     const experienceInput = page.locator('input[name="requirements.experience_years"]');
  151 |     await experienceInput.fill("5");
  152 | 
  153 |     // Click the requirements submit button to reveal Section 2
  154 |     // (Two buttons share this label — the first is in the requirements gate.)
  155 |     const continueButton = page
  156 |       .getByRole("button", {
  157 |         name: "Отправить заявку",
  158 |       })
  159 |       .first();
  160 |     await continueButton.click();
  161 | 
  162 |     // Step 3: Section 2 should now be visible
  163 |     await expect(page.getByText("Полное имя", { exact: false })).toBeVisible();
  164 | 
  165 |     // Fill personal info
  166 |     const nameInput = page.locator('input[name="full_name"]');
  167 |     await nameInput.fill("Тест Тестов");
  168 | 
  169 |     // Fill phone
  170 |     const phoneInput = page.locator('input[inputmode="tel"]');
  171 |     await phoneInput.fill("998901234567");
  172 | 
  173 |     // Upload PDF
  174 |     const fixtureFile = path.join(__dirname, "..", "fixtures", "test-cv.pdf");
  175 |     const fileInput = page.locator('input[type="file"]');
  176 |     await fileInput.setInputFiles(fixtureFile);
  177 | 
  178 |     // Verify file appears
  179 |     await expect(page.getByText("test-cv.pdf")).toBeVisible();
  180 | 
  181 |     // Submit the form
  182 |     const submitButton = page.getByRole("button", {
  183 |       name: "Отправить заявку",
  184 |     });
  185 |     await submitButton.last().click();
  186 | 
  187 |     // Wait a moment for the submission
  188 |     await page.waitForTimeout(2000);
  189 | 
  190 |     // Check if we got success or a validation error (both are acceptable in E2E)
  191 |     const successVisible = await page
  192 |       .getByText("Заявка отправлена!")
  193 |       .isVisible()
  194 |       .catch(() => false);
  195 |     const errorVisible = await page
  196 |       .getByText("Проверка безопасности не пройдена")
  197 |       .isVisible()
  198 |       .catch(() => false);
  199 | 
  200 |     // At minimum, the form should have attempted submission
> 201 |     expect(successVisible || errorVisible).toBe(true);
      |                                            ^ Error: expect(received).toBe(expected) // Object.is equality
  202 |   });
  203 | 
  204 |   test("shows closed state for invalid token", async ({ page }) => {
  205 |     await page.goto("/apply/invalid-token-12345");
  206 | 
  207 |     // The not-found page shows the closed/not-found message
  208 |     await expect(
  209 |       page.getByText(/вакансия закрыта|position closed|vakansiya yopilgan|not found/i),
  210 |     ).toBeVisible({
  211 |       timeout: 15000,
  212 |     });
  213 |   });
  214 | 
  215 |   test("requirement validation blocks Section 2", async ({ page }) => {
  216 |     await page.goto(`/apply/${testToken}`);
  217 | 
  218 |     // Wait for the page to load
  219 |     await expect(page.getByText("E2E Test Position")).toBeVisible({ timeout: 15000 });
  220 | 
  221 |     // Select "No" for boolean requirement
  222 |     const noButton = page.getByText("Нет");
  223 |     await noButton.first().click();
  224 | 
  225 |     // Leave number requirement empty and click submit
  226 |     const continueButton = page
  227 |       .getByRole("button", {
  228 |         name: "Отправить заявку",
  229 |       })
  230 |       .first();
  231 |     await continueButton.click();
  232 | 
  233 |     // Should show error messages
  234 |     await expect(page.getByText("Не соответствует минимальным требованиям").first()).toBeVisible();
  235 | 
  236 |     // Section 2 (personal info) renders in DOM but collapsed via opacity-0 + max-h-0.
  237 |     // The full-name input has no interactable bounding box while hidden — assert
  238 |     // the requirement-failed marker instead, which is only shown while Section 1
  239 |     // is still gating Section 2.
  240 |     await expect(page.getByText("Не соответствует минимальным требованиям").first()).toBeVisible();
  241 |   });
  242 | });
  243 | 
```