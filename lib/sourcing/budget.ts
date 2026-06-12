/**
 * resolveSourcingBudget — operator-controllable per-run search limits.
 *
 * The funnel's fetch/judge budget used to be hardcoded in run.ts. It is now
 * resolved per run with a three-level precedence:
 *   1. hardcoded DEFAULT_SOURCING_BUDGET (always a safe fallback);
 *   2. global platform_settings overrides (operator console → Settings);
 *   3. per-company overrides in subscriptions.manual_override (operator console
 *      → Company → Danger zone), which win over the global value.
 *
 * Anything unset/blank/invalid falls through to the next level down, so a fresh
 * install with no settings behaves exactly as before.
 */
import { logger } from "@/lib/logger";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { FetchBudget } from "./types";

type AdminClient = ReturnType<typeof createAdminClient>;

export const DEFAULT_SOURCING_BUDGET: FetchBudget = {
  maxFetched: 200,
  maxProCalls: 450,
  tokenCeiling: 4_000_000,
};

/**
 * Global cap on shortlist size. The per-run strictness mode picks its own
 * shortlist target, which is then clamped to this operator-controlled maximum.
 */
export const DEFAULT_SHORTLIST_CAP = 30;

export interface ResolvedSourcingBudget {
  budget: FetchBudget;
  shortlistCap: number;
}

/** Map of the operator-tunable knobs to the platform_settings / override keys. */
const KEYS = {
  maxFetched: "sourcing_max_fetched",
  maxProCalls: "sourcing_max_pro_calls",
  shortlistCap: "sourcing_shortlist_size",
} as const;

function parsePositiveInt(raw: unknown, fallback: number): number {
  if (raw == null || raw === "") return fallback;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export async function resolveSourcingBudget(
  admin: AdminClient,
  companyId: string,
): Promise<ResolvedSourcingBudget> {
  // Global platform settings (KV). Missing keys simply leave the default in place.
  const globals: Record<string, string> = {};
  try {
    const { data } = await admin
      .from("platform_settings")
      .select("key, value")
      .in("key", [KEYS.maxFetched, KEYS.maxProCalls, KEYS.shortlistCap]);
    for (const row of data ?? []) globals[row.key] = String(row.value ?? "");
  } catch (err) {
    logger.warn({ err, companyId }, "[sourcing] platform_settings read failed; using defaults");
  }

  // Per-company overrides live alongside the quota overrides in manual_override.
  let override: Record<string, unknown> = {};
  try {
    const { data } = await admin
      .from("subscriptions")
      .select("manual_override")
      .eq("company_id", companyId)
      .maybeSingle();
    override = (data?.manual_override as Record<string, unknown> | null) ?? {};
  } catch (err) {
    logger.warn({ err, companyId }, "[sourcing] manual_override read failed; using global/defaults");
  }

  const pick = (key: string, fallback: number): number => {
    const globalValue = parsePositiveInt(globals[key], fallback);
    // Company override wins over the global default when present.
    return parsePositiveInt(override[key], globalValue);
  };

  const budget: FetchBudget = {
    maxFetched: pick(KEYS.maxFetched, DEFAULT_SOURCING_BUDGET.maxFetched),
    maxProCalls: pick(KEYS.maxProCalls, DEFAULT_SOURCING_BUDGET.maxProCalls),
    tokenCeiling: DEFAULT_SOURCING_BUDGET.tokenCeiling,
  };
  const shortlistCap = pick(KEYS.shortlistCap, DEFAULT_SHORTLIST_CAP);

  return { budget, shortlistCap };
}
