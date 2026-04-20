import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Page, BrowserContext } from "@playwright/test";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabase = Boolean(SUPABASE_URL && SERVICE_ROLE);

export function getAdminClient(): SupabaseClient {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error("SUPABASE_URL / SERVICE_ROLE_KEY not configured");
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export interface TenantFixture {
  userId: string;
  email: string;
  password: string;
  companyId: string;
  companyName: string;
  slug: string;
}

/**
 * Ensures a fully-provisioned tenant exists: confirmed auth user + owner
 * profile + company + subscription + current_company_id set. Returns the
 * credentials callers can use to sign in via the UI.
 */
export async function createTenant(
  admin: SupabaseClient,
  opts: { tag: string; companyName?: string } = { tag: "t" },
): Promise<TenantFixture> {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const email = `e2e-${opts.tag}-${unique}@test.hrats.local`;
  const password = "TestPassword123!";
  const companyName = opts.companyName ?? `Tenant ${opts.tag.toUpperCase()} ${unique}`;
  const slug = `tenant-${opts.tag}-${unique}`.toLowerCase();

  const { data: userRes, error: userErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Owner ${opts.tag.toUpperCase()}` },
  });
  if (userErr || !userRes.user) {
    throw new Error(`createUser failed: ${userErr?.message ?? "no user returned"}`);
  }
  const userId = userRes.user.id;

  const { data: company, error: coErr } = await admin
    .from("companies")
    .insert({ name: companyName, slug, default_locale: "ru" })
    .select("id")
    .single();
  if (coErr || !company) throw new Error(`company insert failed: ${coErr?.message}`);

  const { error: memErr } = await admin
    .from("company_members")
    .insert({ company_id: company.id, user_id: userId, role: "owner" });
  if (memErr) throw new Error(`member insert failed: ${memErr.message}`);

  await admin.from("subscriptions").insert({ company_id: company.id });
  await admin.from("profiles").update({ current_company_id: company.id }).eq("id", userId);

  return { userId, email, password, companyId: company.id, companyName, slug };
}

export async function deleteTenant(admin: SupabaseClient, tenant: TenantFixture): Promise<void> {
  await admin.from("companies").delete().eq("id", tenant.companyId);
  await admin.auth.admin.deleteUser(tenant.userId).catch(() => undefined);
}

export async function signInViaUI(
  ctx: BrowserContext,
  email: string,
  password: string,
): Promise<Page> {
  const page = await ctx.newPage();
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/hr\/dashboard|\/onboarding/, { timeout: 15_000 });
  return page;
}

export async function signInOnPage(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/auth/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/\/hr\/dashboard|\/onboarding/, { timeout: 15_000 });
}
