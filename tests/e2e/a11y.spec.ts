import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  createTenant,
  deleteTenant,
  getAdminClient,
  hasSupabase,
  signInOnPage,
  type TenantFixture,
} from "./utils/tenant";
import type { SupabaseClient } from "@supabase/supabase-js";

const pages = [
  { name: "Login", path: "/auth/login", requiresAuth: false },
  { name: "HR Dashboard", path: "/hr/dashboard", requiresAuth: true },
  { name: "HR Jobs", path: "/hr/jobs", requiresAuth: true },
  { name: "HR Job New", path: "/hr/jobs/new", requiresAuth: true },
];

test.describe("Accessibility", () => {
  let admin: SupabaseClient;
  let tenant: TenantFixture | undefined;

  test.beforeAll(async () => {
    if (!hasSupabase) return;
    admin = getAdminClient();
    tenant = await createTenant(admin, { tag: "a11y" });
  });

  test.afterAll(async () => {
    if (tenant) await deleteTenant(admin, tenant);
  });

  for (const pageConfig of pages) {
    test(`${pageConfig.name} has no critical a11y violations`, async ({ page }) => {
      if (pageConfig.requiresAuth) {
        test.skip(!hasSupabase, "Requires Supabase credentials for auth");
        await signInOnPage(page, tenant!.email, tenant!.password);
      }

      await page.goto(pageConfig.path);
      await page.waitForLoadState("networkidle");

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .disableRules(["color-contrast"]) // Can be noisy with custom themes
        .analyze();

      const critical = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      if (critical.length > 0) {
        const summary = critical
          .map((v) => `[${v.impact}] ${v.id}: ${v.description} (${v.nodes.length} instances)`)
          .join("\n");
        expect(critical, `A11y violations on ${pageConfig.name}:\n${summary}`).toHaveLength(0);
      }
    });
  }
});
