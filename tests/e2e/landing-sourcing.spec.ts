import { test, expect } from "@playwright/test";

// Locale-independent assertions: the section id, brand names (Telegram / hh.uz),
// and the signup href are stable across ru/uz/en.

test("home page shows the active-sourcing section with all three sources", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#sourcing");
  await expect(section).toBeVisible();
  await expect(section).toContainText("hh.uz");
  await expect(section).toContainText("Telegram");
  // CTA into signup, tagged with the sourcing utm section.
  await expect(section.locator('a[href*="/auth/signup"]')).toHaveCount(1);
  // Deep-dive link to the product page.
  await expect(section.locator('a[href="/product/sourcing"]')).toHaveCount(1);
});

test("sourcing product page renders a headline and a signup CTA", async ({ page }) => {
  await page.goto("/product/sourcing");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByText("Telegram").first()).toBeVisible();
  await expect(page.locator('a[href*="/auth/signup"]').first()).toBeVisible();
});
