import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(["color-contrast"])
    .analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious",
  );
  expect(serious, serious.map((violation) => violation.id).join(", ")).toHaveLength(0);
}

test.describe("Design verification baseline", () => {
  test.describe.configure({ timeout: 60_000 });

  for (const route of [
    { name: "marketing", path: "/" },
    { name: "auth", path: "/auth/login" },
  ]) {
    test(`${route.name} surface is stable at desktop and phone widths`, async ({
      page,
    }, testInfo) => {
      for (const viewport of [
        { name: "desktop", width: 1440, height: 900 },
        { name: "phone", width: 375, height: 812 },
      ]) {
        await page.setViewportSize(viewport);
        await page.goto(route.path);
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalOverflow(page);
        await attachScreenshot(page, testInfo, `${route.name}-${viewport.name}`);
      }
    });
  }

  test("auth shell uses the shared identity and semantic foundation", async ({ page }) => {
    await page.goto("/auth/login");
    await expect(page.locator('svg[viewBox="0 0 24 24"]').first()).toBeVisible();
    const foundation = await page.evaluate(() => {
      const styles = getComputedStyle(document.body);
      return {
        font: styles.fontFamily,
        canvas: styles.backgroundColor,
        focus: getComputedStyle(document.documentElement).getPropertyValue("--color-focus").trim(),
      };
    });
    expect(foundation.font).toContain("Manrope");
    expect(foundation.canvas).toBe("rgb(255, 255, 255)");
    expect(foundation.focus).toBe("#0a66c2");
  });

  test("representative public and auth surfaces have no serious accessibility violations", async ({
    page,
  }) => {
    for (const path of ["/", "/auth/login"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoSeriousA11yViolations(page);
    }
  });

  test("review route covers themes, locales, focus, and the 16px mark", async ({
    page,
  }, testInfo) => {
    test.skip(
      process.env.ENABLE_DESIGN_REVIEW !== "1" && process.env.PLAYWRIGHT_DEV !== "1",
      "Set ENABLE_DESIGN_REVIEW=1 or PLAYWRIGHT_DEV=1 to expose the review route.",
    );

    await page.goto("/dev");
    await expect(page.getByRole("img", { name: "16px mark" })).toBeVisible();

    await page.getByRole("button", { name: "uz", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Eng kuchli nomzodlar darhol ko'rinadi." }),
    ).toBeVisible();

    await page.getByRole("button", { name: "en", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "The strongest candidates are clear immediately." }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Use dark theme" }).click();
    await expect(page.getByTestId("design-system-review")).toHaveAttribute("data-theme", "dark");

    await page.keyboard.press("Shift+Tab");
    const focus = await page.evaluate(() => {
      const active = document.activeElement;
      const styles = getComputedStyle(active!);
      return {
        text: active?.textContent?.trim(),
        color: styles.outlineColor,
        style: styles.outlineStyle,
        width: styles.outlineWidth,
      };
    });
    expect(focus.text).toBe("en");
    expect(focus.style).toBe("solid");
    expect(focus.color).toBe("rgb(77, 158, 255)");
    expect(Number.parseFloat(focus.width)).toBeGreaterThanOrEqual(2);

    await expectNoHorizontalOverflow(page);
    await expectNoSeriousA11yViolations(page);
    await attachScreenshot(page, testInfo, "design-review-dark-en");
  });
});
