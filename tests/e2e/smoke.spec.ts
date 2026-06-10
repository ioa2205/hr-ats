import { test, expect } from "@playwright/test";

test("loads home page and shows ATS text", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("ATS").first()).toBeVisible();
});
