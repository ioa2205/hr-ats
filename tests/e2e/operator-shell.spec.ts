import { test, expect, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Operator console shell (PR #1): sidebar rebrand, top bar, command palette,
 * keyboard-shortcut cheatsheet, and dark-mode toggle.
 *
 * Requires a running Supabase instance — gated on SUPABASE_URL + SERVICE_ROLE.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE);

type Operator = { userId: string; email: string; password: string };
type Tenant = { userId: string; companyId: string; companyName: string };

async function seedOperator(admin: SupabaseClient): Promise<Operator> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `e2e-shell-${unique}@test.hrats.local`;
  const password = "TestPassword123!";

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Shell Operator ${unique}` },
  });
  if (error || !created.user) throw new Error(`createUser failed: ${error?.message}`);

  await admin.from("profiles").update({ is_operator: true }).eq("id", created.user.id);
  return { userId: created.user.id, email, password };
}

async function seedTenant(admin: SupabaseClient): Promise<Tenant> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `e2e-shell-tenant-${unique}@test.hrats.local`;
  const companyName = `ShellTenant ${unique}`;
  const slug = `shelltenant-${unique}`.toLowerCase();

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password: "TestPassword123!",
    email_confirm: true,
  });
  if (error || !created.user) throw new Error(`createUser failed: ${error?.message}`);

  const { data: company, error: coErr } = await admin
    .from("companies")
    .insert({ name: companyName, slug, default_locale: "ru" })
    .select("id")
    .single();
  if (coErr || !company) throw new Error(`company insert failed: ${coErr?.message}`);

  await admin.from("company_members").insert({
    company_id: company.id,
    user_id: created.user.id,
    role: "owner",
  });
  await admin.from("subscriptions").insert({ company_id: company.id });

  return { userId: created.user.id, companyId: company.id, companyName };
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/operator|\/hr|\/onboarding/, { timeout: 15_000 });
}

test.describe("Operator console shell", () => {
  test.skip(!hasSupabase, "Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

  let admin: SupabaseClient;
  let operator: Operator;
  let tenant: Tenant;

  test.beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SERVICE_ROLE!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    operator = await seedOperator(admin);
    tenant = await seedTenant(admin);
  });

  test.afterAll(async () => {
    if (tenant) {
      await admin.from("companies").delete().eq("id", tenant.companyId);
      await admin.auth.admin.deleteUser(tenant.userId).catch(() => undefined);
    }
    if (operator) await admin.auth.admin.deleteUser(operator.userId).catch(() => undefined);
  });

  test("sidebar shows TezHR · Operator wordmark and three sections", async ({ browser }) => {
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();
      await signIn(page, operator.email, operator.password);
      await page.goto("/operator");

      const sidebar = page.locator("aside:visible");
      await expect(sidebar.getByText("TezHR", { exact: true })).toBeVisible();
      await expect(sidebar.getByText(/Operator/i)).toBeVisible();

      // Three section labels
      await expect(page.locator("aside").getByText(/Overview|Обзор/i)).toBeVisible();
      await expect(page.locator("aside").getByText(/Tenants|Арендатор/i)).toBeVisible();
      await expect(page.locator("aside").getByText(/Platform|Платформа/i)).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test("⌘K opens the command palette and Enter navigates to a company", async ({ browser }) => {
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();
      await signIn(page, operator.email, operator.password);
      await page.goto("/operator");

      // Open palette via keyboard (works cross-platform: Ctrl+K also fires).
      await page.keyboard.press("Control+k");

      const palette = page.getByRole("dialog");
      await expect(palette).toBeVisible();

      // Type unique slug fragment; wait for the debounced fetch.
      await page.keyboard.type("shelltenant");
      await expect(palette.getByText(tenant.companyName)).toBeVisible({ timeout: 5_000 });

      await page.keyboard.press("Enter");
      await page.waitForURL(new RegExp(`/operator/companies/${tenant.companyId}`), {
        timeout: 10_000,
      });
    } finally {
      await ctx.close();
    }
  });

  test("? opens the shortcuts cheatsheet", async ({ browser }) => {
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();
      await signIn(page, operator.email, operator.password);
      await page.goto("/operator");

      await page.keyboard.press("Shift+/");
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText(/⌘K|Ctrl\+K/)).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test("platform pulse pill is visible in the top bar", async ({ browser }) => {
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();
      await signIn(page, operator.email, operator.password);
      await page.goto("/operator");

      const pill = page.getByTestId("platform-pulse-pill");
      await expect(pill).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test("dark-mode toggle persists the theme choice", async ({ browser }) => {
    const ctx = await browser.newContext();
    try {
      const page = await ctx.newPage();
      await signIn(page, operator.email, operator.password);
      await page.goto("/operator");

      const shell = page.locator(".operator-shell-root").first();
      const initial = await shell.getAttribute("data-theme");

      await page.getByRole("button", { name: /dark theme|light theme|Тёмная|Светлая/i }).click();
      await expect(shell).not.toHaveAttribute("data-theme", initial ?? "");

      const afterToggle = await shell.getAttribute("data-theme");
      await page.reload();
      await expect(page.locator(".operator-shell-root").first()).toHaveAttribute(
        "data-theme",
        afterToggle ?? "",
      );
    } finally {
      await ctx.close();
    }
  });
});
