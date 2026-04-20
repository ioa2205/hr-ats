import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const querySchema = z.object({
  range: z.enum(["30", "90"]).default("30"),
});

export interface DashboardResponse {
  generatedAt: string;
  range: 30 | 90;
  health: {
    platform: { state: "ok" | "amber" | "red"; aiFailureRate24h: number };
    aiCostBurn: { state: "ok" | "amber" | "red"; today: number; avgDaily30d: number };
    trialToPaid7d: { pct: number; trials: number; conversions: number };
    mrrEstimate: { usd: number; activeSubs: number; delta30dUsd: number };
  };
  timeseries: Array<{
    day: string;
    activeCompanies: number;
    candidatesProcessed: number;
    dailyActiveUsers: number;
    aiCostUsd: number;
  }>;
  topMovers: {
    growing: Array<{ companyId: string; name: string; delta: number; candidates: number }>;
    atRisk: Array<{ companyId: string; name: string; score: number; reason: string }>;
  };
  recentActivity: Array<{
    id: number;
    action: string;
    actor: string | null;
    entityType: string | null;
    entityId: string | null;
    createdAt: string;
  }>;
}

/** Proxy price until billing lands. Spec §4.2 calls for an MRR estimate —
 *  we use this constant + active Pro-plan subscription count. */
const PRO_PLAN_MONTHLY_USD = 49;

export async function GET(request: NextRequest) {
  const auth = await requireOperatorApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = querySchema.safeParse({
    range: request.nextUrl.searchParams.get("range") ?? "30",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }
  const range = Number(parsed.data.range) as 30 | 90;

  const admin = createAdminClient();

  try {
    const rangeStart = new Date(Date.now() - range * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const [
      tsRes,
      moversGrowingRes,
      moversAtRiskRes,
      activityRes,
      aiFailureRes,
      activeSubsRes,
      activeSubs30dAgoRes,
      trials7dRes,
      conversions7dRes,
    ] = await Promise.all([
      admin
        .from("operator_daily_metrics")
        .select("day, active_companies, candidates_processed, daily_active_users, ai_cost_usd")
        .gte("day", rangeStart)
        .order("day", { ascending: true }),

      admin
        .from("company_usage_30d")
        .select("company_id, name, candidate_count_30d")
        .order("candidate_count_30d", { ascending: false })
        .limit(5),

      admin
        .from("company_health")
        .select("company_id, name, score, past_due, active_jobs, member_count, last_login_at")
        .lt("score", 40)
        .order("score", { ascending: true })
        .limit(5),

      admin
        .from("audit_log")
        .select("id, action, actor, entity_type, entity_id, created_at, actor_user_id")
        .in("action", [
          "impersonation.started",
          "impersonation.ended",
          "impersonation.expired",
          "company.suspended",
          "company.activated",
          "operator.quota_override",
          "operator.plan_changed",
          "templates.updated",
          "operator.cv_reveal",
        ])
        .order("created_at", { ascending: false })
        .limit(10),

      admin
        .from("ai_processing_attempts")
        .select("status", { count: "exact" })
        .gte("created_at", oneDayAgo),

      // `subscriptions` has no `plan` column — plan is derived from status +
      // pro_started_at. Active Pro subs ≈ status='active' AND pro_started_at
      // set; trials ≈ status='trialing'.
      admin
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .not("pro_started_at", "is", null),

      admin
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .not("pro_started_at", "is", null)
        .lt("pro_started_at", thirtyDaysAgo),

      admin
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "trialing")
        .lt("updated_at", sevenDaysAgo)
        .gte("updated_at", sixtyDaysAgo),

      admin
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .not("pro_started_at", "is", null)
        .gte("pro_started_at", sevenDaysAgo),
    ]);

    if (tsRes.error) throw tsRes.error;
    if (activityRes.error) throw activityRes.error;

    // AI failure rate
    let failed = 0;
    let totalAttempts = 0;
    const aiRows = (aiFailureRes.data ?? []) as Array<{ status: string }>;
    for (const row of aiRows) {
      totalAttempts++;
      if (row.status !== "success") failed++;
    }
    const failureRate = totalAttempts > 0 ? failed / totalAttempts : 0;

    // Platform health — amber if failure rate > 10%, red if > 25%.
    const platformState: "ok" | "amber" | "red" =
      failureRate > 0.25 ? "red" : failureRate > 0.1 ? "amber" : "ok";

    // AI cost burn
    const tsRows = tsRes.data ?? [];
    const last30 = tsRows.slice(-30);
    const todayRow = tsRows[tsRows.length - 1];
    const today = Number(todayRow?.ai_cost_usd ?? 0);
    const avg30d =
      last30.length > 0
        ? last30.reduce((s, r) => s + Number(r.ai_cost_usd ?? 0), 0) / last30.length
        : 0;
    const burnRatio = avg30d > 0 ? today / avg30d : 0;
    const costState: "ok" | "amber" | "red" =
      burnRatio > 1.5 ? "red" : burnRatio > 1.2 ? "amber" : "ok";

    // Trial→Paid funnel (7d)
    const trials = trials7dRes.count ?? 0;
    const conversions = conversions7dRes.count ?? 0;
    const pct = trials > 0 ? Math.round((conversions / trials) * 100) : 0;

    // MRR
    const activeSubs = activeSubsRes.count ?? 0;
    const activeSubs30dAgo = activeSubs30dAgoRes.count ?? 0;
    const mrrUsd = activeSubs * PRO_PLAN_MONTHLY_USD;
    const delta30dUsd = (activeSubs - activeSubs30dAgo) * PRO_PLAN_MONTHLY_USD;

    const timeseries = tsRows.map((r) => ({
      day: r.day as string,
      activeCompanies: Number(r.active_companies ?? 0),
      candidatesProcessed: Number(r.candidates_processed ?? 0),
      dailyActiveUsers: Number(r.daily_active_users ?? 0),
      aiCostUsd: Number(r.ai_cost_usd ?? 0),
    }));

    // Top movers: growing by candidate_count_30d (heuristic until we track diffs).
    const growing = (moversGrowingRes.data ?? [])
      .filter((m) => Number(m.candidate_count_30d) > 0)
      .slice(0, 5)
      .map((m) => ({
        companyId: m.company_id as string,
        name: (m.name as string) ?? "—",
        delta: Number(m.candidate_count_30d),
        candidates: Number(m.candidate_count_30d),
      }));

    const atRisk = (moversAtRiskRes.data ?? []).slice(0, 5).map((m) => {
      const reasons: string[] = [];
      if (m.past_due) reasons.push("past_due");
      if (Number(m.active_jobs ?? 0) === 0) reasons.push("no_jobs");
      if (!m.last_login_at) reasons.push("no_logins_14d");
      if (Number(m.member_count ?? 0) <= 1) reasons.push("sole_seat");
      return {
        companyId: m.company_id as string,
        name: (m.name as string) ?? "—",
        score: Number(m.score),
        reason: reasons.join(","),
      };
    });

    const recentActivity = (activityRes.data ?? []).map((r) => ({
      id: Number(r.id),
      action: r.action as string,
      actor: (r.actor as string | null) ?? null,
      entityType: (r.entity_type as string | null) ?? null,
      entityId: (r.entity_id as string | null) ?? null,
      createdAt: r.created_at as string,
    }));

    const body: DashboardResponse = {
      generatedAt: new Date().toISOString(),
      range,
      health: {
        platform: {
          state: platformState,
          aiFailureRate24h: Math.round(failureRate * 1000) / 1000,
        },
        aiCostBurn: {
          state: costState,
          today: Math.round(today * 100) / 100,
          avgDaily30d: Math.round(avg30d * 100) / 100,
        },
        trialToPaid7d: { pct, trials, conversions },
        mrrEstimate: { usd: mrrUsd, activeSubs, delta30dUsd },
      },
      timeseries,
      topMovers: { growing, atRisk },
      recentActivity,
    };

    return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    logger.error({ err }, "[api/operator/dashboard] failed");
    return NextResponse.json({ error: "dashboard_failed" }, { status: 500 });
  }
}
