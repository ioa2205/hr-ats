import { createAdminClient } from "@/lib/supabase/admin";
import { getQuotaState } from "@/lib/companies/quota";

export interface SettingsNavWarnings {
  /** Billing: persimmon dot when trial ends in ≤3 days (or is past). */
  billing: { trialEnding: boolean; plan: "pro" | "trial" | null };
  /** Company: persimmon dot when logo_url is null. */
  company: { noLogo: boolean };
  /** Team: persimmon dot when there's exactly one Owner. */
  team: { soleOwner: boolean };
  /** AI: persimmon dot when auto-screen is explicitly disabled. */
  ai: { disabled: boolean };
  /** Notifications: unread badge count (0 suppresses the badge). */
  notifications: { unread: number };
}

const TRIAL_WARNING_DAYS = 3;
const AI_SETTING_KEY = "auto_screen_enabled";

/**
 * Computes every persimmon-dot / pill signal rendered in the settings rail.
 * Called once per settings-page request by the server layout. Failures
 * gracefully degrade to "no warning" rather than throwing.
 */
export async function getSettingsWarnings(companyId: string): Promise<SettingsNavWarnings> {
  const admin = createAdminClient();

  const [quota, companyRes, ownersRes, aiRes, notifRes] = await Promise.all([
    getQuotaState(companyId),
    admin.from("companies").select("logo_url").eq("id", companyId).single(),
    admin
      .from("company_members")
      .select("user_id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("role", "owner"),
    admin
      .from("company_settings")
      .select("value")
      .eq("company_id", companyId)
      .eq("key", AI_SETTING_KEY)
      .maybeSingle(),
    readUnreadNotifications(companyId),
  ]);

  const trialEnding = Boolean(
    quota &&
      (quota.status === "trialing" || quota.status === "expired") &&
      quota.daysRemaining <= TRIAL_WARNING_DAYS,
  );

  const plan: "pro" | "trial" | null =
    quota?.status === "active" ? "pro" : quota?.status === "trialing" ? "trial" : null;

  return {
    billing: { trialEnding, plan },
    company: { noLogo: !companyRes.data?.logo_url },
    team: { soleOwner: (ownersRes.count ?? 0) <= 1 },
    ai: { disabled: aiRes.data?.value === "false" },
    notifications: { unread: notifRes },
  };
}

/** Unread notification count for the current user across this company. */
async function readUnreadNotifications(companyId: string): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .is("read_at", null);
  if (error) return 0;
  return count ?? 0;
}
