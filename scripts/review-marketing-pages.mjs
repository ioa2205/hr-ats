import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import fs from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.MARKETING_REVIEW_URL || "http://localhost:3000";
const outputDir = path.resolve("test-results/marketing-review");
const locales = (process.env.MARKETING_REVIEW_LOCALES || "en").split(",");
const routes = [
  ["home", "/"],
  ["pricing", "/pricing"],
  ["about", "/about"],
  ["contact", "/contact"],
  ["security", "/security"],
  ["candidates", "/for-candidates"],
  ["multilingual", "/product/multilingual"],
  ["local-market", "/product/local-market"],
  ["sourcing", "/product/sourcing"],
  ["terms", "/terms"],
  ["privacy", "/privacy"],
];
const viewports = [
  ["desktop", { width: 1440, height: 1000 }],
  ["mobile", { width: 390, height: 844 }],
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

for (const locale of locales) {
  for (const [viewportName, viewport] of viewports) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    await context.addCookies([{ name: "locale", value: locale, url: baseUrl }]);
    for (const [name, route] of routes) {
      const page = await context.newPage();
      const consoleErrors = [];
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });
      const response = await page.goto(`${baseUrl}${route}`, {
        waitUntil: "networkidle",
        timeout: 45_000,
      });
      await page.addStyleTag({ content: "nextjs-portal { display: none; }" });
      await page.evaluate(async () => {
        await document.fonts.ready;
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise((resolve) => setTimeout(resolve, 120));
        window.scrollTo(0, 0);
      });
      const diagnostics = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelector("h1")?.textContent?.replace(/\s+/g, " ").trim() || "",
        horizontalOverflow:
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
        brokenImages: [...document.images]
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src),
        mainCount: document.querySelectorAll("main").length,
        language: document.documentElement.lang,
        navigationOverflow: (() => {
          const nav = document.querySelector(".craft-nav");
          return nav ? nav.scrollWidth - nav.clientWidth : 0;
        })(),
        heroImageOverlap: (() => {
          const hero = document.querySelector("main > section:first-child");
          const artwork = hero?.querySelector("img");
          if (!artwork) return [];
          const image = artwork.getBoundingClientRect();
          return [...hero.querySelectorAll("h1, .craft-lede, .craft-actions, .craft-page-meta")]
            .filter((element) => {
              const text = element.getBoundingClientRect();
              return (
                text.left < image.right &&
                text.right > image.left &&
                text.top < image.bottom &&
                text.bottom > image.top
              );
            })
            .map((element) => element.className);
        })(),
      }));
      const axe = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const seriousAccessibilityViolations = axe.violations
        .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
        .map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
        }));
      const screenshot = path.join(outputDir, `${locale}-${viewportName}-${name}.png`);
      await page.screenshot({ path: screenshot, fullPage: true, animations: "disabled" });
      await page.screenshot({
        path: path.join(outputDir, `${locale}-${viewportName}-${name}-hero.png`),
        animations: "disabled",
      });
      results.push({
        locale,
        viewport: viewportName,
        route,
        status: response?.status() ?? null,
        ...diagnostics,
        seriousAccessibilityViolations,
        consoleErrors,
        screenshot,
      });
      if (viewportName === "mobile" && name === "home") {
        await page.locator(".craft-menu-button").click();
        const menuScreenshot = path.join(outputDir, `${locale}-mobile-home-menu.png`);
        await page.locator("#marketing-mobile-menu").screenshot({
          path: menuScreenshot,
          animations: "disabled",
        });
        results.push({
          viewport: "mobile-menu",
          locale,
          route,
          visible: await page.locator("#marketing-mobile-menu").isVisible(),
          screenshot: menuScreenshot,
        });
      }
      await page.close();
    }
    await context.close();
  }
}

await browser.close();
await fs.writeFile(path.join(outputDir, "report.json"), JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
