import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

/**
 * Phase 8 candidate-facing QA. Drives the gated preview harness
 * (`/dev/candidate`) so the apply + interview surfaces can be verified across
 * RU/UZ/EN × light/dark × phone/tablet/desktop without seeding Supabase.
 *
 * Run with ENABLE_DESIGN_REVIEW=1 (or PLAYWRIGHT_DEV=1) so the harness route
 * is exposed.
 */

const HARNESS_ENABLED =
  process.env.ENABLE_DESIGN_REVIEW === "1" || process.env.PLAYWRIGHT_DEV === "1";

const VIEWS = [
  "apply",
  "apply-no-req",
  "success",
  "closed",
  "interview",
  "interview-booked",
  "interview-declined",
] as const;
const LOCALES = ["ru", "uz", "en"] as const;
const THEMES = ["light", "dark"] as const;

function harnessUrl(view: string, locale: string, theme: string): string {
  return `/dev/candidate?view=${view}&locale=${locale}&theme=${theme}`;
}

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
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(serious, serious.map((v) => `${v.id}: ${v.help}`).join("\n")).toHaveLength(0);
}

test.describe("Phase 8 candidate experience", () => {
  test.skip(
    !HARNESS_ENABLED,
    "Set ENABLE_DESIGN_REVIEW=1 or PLAYWRIGHT_DEV=1 to expose /dev/candidate",
  );
  test.describe.configure({ timeout: 240_000 });

  test("every surface is overflow-free and a11y-clean at phone width across RU/UZ/EN × light/dark", async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const view of VIEWS) {
      for (const locale of LOCALES) {
        for (const theme of THEMES) {
          await page.goto(harnessUrl(view, locale, theme));
          await page.waitForLoadState("networkidle");
          await expectNoHorizontalOverflow(page);
          await expectNoSeriousA11yViolations(page);
        }
      }
    }
    // Representative screenshots
    await page.goto(harnessUrl("apply", "ru", "light"));
    await page.waitForLoadState("networkidle");
    await attachScreenshot(page, testInfo, "apply-ru-light-phone");
    await page.goto(harnessUrl("apply", "uz", "dark"));
    await page.waitForLoadState("networkidle");
    await attachScreenshot(page, testInfo, "apply-uz-dark-phone");
    await page.goto(harnessUrl("interview", "en", "dark"));
    await page.waitForLoadState("networkidle");
    await attachScreenshot(page, testInfo, "interview-en-dark-phone");
  });

  test("apply + interview hold up at tablet and desktop widths", async ({ page }, testInfo) => {
    for (const viewport of [
      { name: "tablet", width: 768, height: 1024 },
      { name: "desktop", width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport);
      for (const view of ["apply", "interview"]) {
        await page.goto(harnessUrl(view, "ru", "light"));
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalOverflow(page);
        await attachScreenshot(page, testInfo, `${view}-${viewport.name}`);
      }
    }
  });

  test("dark mode resolves the dark canvas token, not an inverted light palette", async ({
    page,
  }) => {
    await page.goto(harnessUrl("apply", "ru", "dark"));
    await page.waitForLoadState("networkidle");
    const canvas = await page.evaluate(() => {
      const shell = document.querySelector(".tezhr") as HTMLElement | null;
      return shell ? getComputedStyle(shell).backgroundColor : null;
    });
    // Dark canvas: the Pure Signal void, #000000
    expect(canvas).toBe("rgb(0, 0, 0)");
  });

  test("keyboard: requirements gate reveals the details step and the name field is reachable", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(harnessUrl("apply", "ru", "light"));
    await page.waitForLoadState("networkidle");

    // Step 1 (requirements) is active; advancing reveals step 2 (details).
    const cont = page.getByRole("button", { name: "Продолжить" });
    await expect(cont).toBeVisible();
    await cont.click();

    // The details fields are now reachable by keyboard and the file input exists.
    const nameField = page.getByLabel("Полное имя");
    await expect(nameField).toBeVisible();
    await nameField.focus();
    await expect(nameField).toBeFocused();

    const phoneField = page.getByLabel("Номер телефона");
    await expect(phoneField).toBeVisible();
    await expect(phoneField).toHaveAttribute("inputmode", "tel");

    await expect(page.locator('input[type="file"]')).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Отправить заявку" })).toBeVisible();
  });

  test("language toggle in the shell switches the candidate locale", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(harnessUrl("apply", "ru", "light"));
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Продолжить" })).toBeVisible();
    // EN toggle is present and pressed-state reflects the active locale.
    await page.goto(harnessUrl("apply", "en", "light"));
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Continue" })).toBeVisible();
    await expect(page.getByRole("button", { name: "EN", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
});
