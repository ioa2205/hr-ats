import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

/**
 * Phase 9 operator-console QA. Drives the gated preview harness
 * (`/dev/operator`) so the dense operator surfaces render with a mocked operator
 * API across RU/UZ/EN × light/dark × widths — verified without seeding Supabase.
 *
 * Run with ENABLE_DESIGN_REVIEW=1 (or PLAYWRIGHT_DEV=1) so the harness route is
 * exposed.
 */

const HARNESS_ENABLED =
  process.env.ENABLE_DESIGN_REVIEW === "1" || process.env.PLAYWRIGHT_DEV === "1";

const VIEWS = [
  "dashboard",
  "companies",
  "inbox",
  "incidents",
  "settings",
  "company-detail",
  "impersonation",
] as const;
const LOCALES = ["ru", "uz", "en"] as const;
const THEMES = ["light", "dark"] as const;

function harnessUrl(view: string, locale: string, theme: string): string {
  return `/dev/operator?view=${view}&locale=${locale}&theme=${theme}`;
}

async function attachScreenshot(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
}

async function expectNoHorizontalOverflow(page: Page, ctx: string) {
  const { overflow, offenders } = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    const over = document.documentElement.scrollWidth - docW;
    const offenders: string[] = [];
    if (over > 1) {
      document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.right > docW + 1 && r.width > 0 && r.width <= 4096) {
          offenders.push(
            `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ").slice(0, 3).join(".")} → right=${Math.round(r.right)} w=${Math.round(r.width)}`,
          );
        }
      });
    }
    return { overflow: over, offenders: offenders.slice(0, 8) };
  });
  expect(overflow, `horizontal overflow on ${ctx}\n${offenders.join("\n")}`).toBeLessThanOrEqual(1);
}

async function expectNoSeriousA11yViolations(page: Page, ctx: string) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .disableRules(["color-contrast"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(
    serious,
    `${ctx}\n${serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`).join("\n")}`,
  ).toHaveLength(0);
}

test.describe("Phase 9 operator console", () => {
  test.skip(
    !HARNESS_ENABLED,
    "Set ENABLE_DESIGN_REVIEW=1 or PLAYWRIGHT_DEV=1 to expose /dev/operator",
  );
  test.describe.configure({ timeout: 300_000 });

  test("every surface is overflow-free and a11y-clean at desktop across RU/UZ/EN × light/dark", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    for (const view of VIEWS) {
      for (const locale of LOCALES) {
        for (const theme of THEMES) {
          await page.goto(harnessUrl(view, locale, theme));
          await page.waitForLoadState("networkidle");
          const ctx = `${view} · ${locale} · ${theme} · 1280`;
          await expectNoHorizontalOverflow(page, ctx);
          await expectNoSeriousA11yViolations(page, ctx);
        }
      }
    }
  });

  test("operator console stays overflow-free at tablet and phone widths (desktop-first fallback)", async ({
    page,
  }, testInfo) => {
    for (const viewport of [
      { name: "tablet", width: 768, height: 1024 },
      { name: "phone", width: 375, height: 812 },
    ]) {
      await page.setViewportSize(viewport);
      for (const view of VIEWS) {
        await page.goto(harnessUrl(view, "ru", "light"));
        await page.waitForLoadState("networkidle");
        await expectNoHorizontalOverflow(page, `${view} · ru · light · ${viewport.name}`);
      }
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(harnessUrl("dashboard", "ru", "light"));
    await page.waitForLoadState("networkidle");
    await attachScreenshot(page, testInfo, "dashboard-ru-light-phone");
  });

  test("representative dense surfaces — desktop screenshots", async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const [view, locale, theme] of [
      ["dashboard", "ru", "light"],
      ["companies", "uz", "dark"],
      ["company-detail", "en", "light"],
      ["incidents", "ru", "dark"],
    ] as const) {
      await page.goto(harnessUrl(view, locale, theme));
      await page.waitForLoadState("networkidle");
      await attachScreenshot(page, testInfo, `${view}-${locale}-${theme}`);
    }
  });

  test("dark mode resolves the dark canvas token, not an inverted light palette", async ({
    page,
  }) => {
    await page.goto(harnessUrl("dashboard", "ru", "dark"));
    await page.waitForLoadState("networkidle");
    const canvas = await page.evaluate(() => {
      const shell = document.querySelector(".tezhr") as HTMLElement | null;
      return shell ? getComputedStyle(shell).backgroundColor : null;
    });
    // Dark canvas #111416
    expect(canvas).toBe("rgb(17, 20, 22)");
  });

  test("incident resolve uses an accessible dialog with a guarded submit", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(harnessUrl("incidents", "en", "light"));
    await page.waitForLoadState("networkidle");

    // Open the resolve dialog on the first firing incident.
    await page.getByRole("button", { name: "Resolve…" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const note = dialog.getByLabel("Resolution note");
    await expect(note).toBeVisible();
    await note.focus();
    await expect(note).toBeFocused();

    // Submit is guarded until a note is entered.
    const submit = dialog.getByRole("button", { name: "Resolve", exact: true });
    await expect(submit).toBeDisabled();
    await note.fill("False positive — backfilled the missing job rows.");
    await expect(submit).toBeEnabled();

    // Escape closes the dialog (Radix focus management intact).
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("suspending a company requires explicit confirmation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(harnessUrl("company-detail", "en", "light"));
    await page.waitForLoadState("networkidle");

    // The active company shows a Suspend action that opens a confirm dialog
    // rather than firing immediately.
    await page.getByRole("button", { name: "Suspend" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/read-only/i)).toBeVisible();
  });

  test("platform settings use a switch and a reason-gated save dialog", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(harnessUrl("settings", "en", "light"));
    await page.waitForLoadState("networkidle");

    // Move to the Platform tab.
    await page.getByRole("button", { name: "Platform" }).click();
    await expect(page.getByRole("switch").first()).toBeVisible();

    // Editing a value enables Save, which opens the reason dialog.
    const geminiRow = page.locator("li", { hasText: "Gemini model override" });
    await geminiRow.getByLabel("Gemini model override").fill("gemini-3-flash");
    await geminiRow.getByRole("button", { name: "Save" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const confirm = dialog.getByRole("button", { name: "Save", exact: true });
    await expect(confirm).toBeDisabled();
    await dialog.getByLabel(/Reason/i).fill("Switching to flash for cost during the trial spike.");
    await expect(confirm).toBeEnabled();
  });
});
