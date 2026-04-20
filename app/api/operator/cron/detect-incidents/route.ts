import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Rule-based incident detection. Gated by CRON_SECRET. Fires incidents into
 * operator_incidents; the unique index on (rule_id, target_id) prevents
 * duplicate firing for the same target while still "firing".
 *
 * Rules implemented:
 *  - ai_cost_spike
 *  - quota_exhausted
 *  - trial_expiring
 *  - ai_failure_burst
 *  - suspicious_upload
 *
 * Skipped for MVP (need richer telemetry): login_anomaly, operator_action_burst.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const fired: Array<{ rule: string; target: string | null }> = [];

  try {
    const nowIso = new Date().toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // --- ai_cost_spike ---
    const { data: costByCompany } = await admin
      .from("ai_processing_attempts")
      .select("company_id, cost_usd, created_at")
      .gte("created_at", sevenDaysAgo);

    if (costByCompany) {
      const agg = new Map<string, { d1: number; d7: number }>();
      const oneDayStart = Date.parse(oneDayAgo);
      for (const r of costByCompany) {
        const id = r.company_id as string | null;
        if (!id) continue;
        const cur = agg.get(id) ?? { d1: 0, d7: 0 };
        const cost = Number(r.cost_usd ?? 0);
        cur.d7 += cost;
        if (Date.parse(r.created_at as string) >= oneDayStart) cur.d1 += cost;
        agg.set(id, cur);
      }
      for (const [companyId, v] of agg) {
        const avgDaily7 = v.d7 / 7;
        if (v.d1 > 5 && avgDaily7 > 0 && v.d1 > avgDaily7 * 5) {
          await fireIncident(admin, {
            rule: "ai_cost_spike",
            severity: "warn",
            targetType: "company",
            targetId: companyId,
            summary: `AI cost burst: $${v.d1.toFixed(2)} in 24h vs $${avgDaily7.toFixed(2)}/day (7d avg)`,
            details: { cost_24h: v.d1, avg_daily_7d: avgDaily7 },
            firedAt: nowIso,
          });
          fired.push({ rule: "ai_cost_spike", target: companyId });
        }
      }
    }

    // --- quota_exhausted ---
    const { data: quotaRows } = await admin
      .from("subscriptions")
      .select("company_id, cv_quota_used, cv_quota_limit");
    for (const r of quotaRows ?? []) {
      const used = Number(r.cv_quota_used ?? 0);
      const limit = Number(r.cv_quota_limit ?? 0);
      if (limit > 0 && used >= limit) {
        await fireIncident(admin, {
          rule: "quota_exhausted",
          severity: "warn",
          targetType: "company",
          targetId: r.company_id as string,
          summary: `CV quota exhausted (${used}/${limit})`,
          details: { used, limit },
          firedAt: nowIso,
        });
        fired.push({ rule: "quota_exhausted", target: r.company_id as string });
      }
    }

    // --- trial_expiring ---
    const { data: trials } = await admin
      .from("subscriptions")
      .select("company_id, trial_ends_at, plan, status")
      .eq("plan", "trial")
      .gte("trial_ends_at", nowIso)
      .lte("trial_ends_at", in3Days);
    for (const r of trials ?? []) {
      await fireIncident(admin, {
        rule: "trial_expiring",
        severity: "info",
        targetType: "company",
        targetId: r.company_id as string,
        summary: `Trial ends by ${new Date(r.trial_ends_at as string).toISOString().slice(0, 10)}`,
        details: { trial_ends_at: r.trial_ends_at },
        firedAt: nowIso,
      });
      fired.push({ rule: "trial_expiring", target: r.company_id as string });
    }

    // --- ai_failure_burst ---
    const { data: lastHour } = await admin
      .from("ai_processing_attempts")
      .select("company_id, status")
      .gte("created_at", oneHourAgo);
    if (lastHour) {
      const tally = new Map<string, { total: number; failed: number }>();
      for (const r of lastHour) {
        const id = r.company_id as string | null;
        if (!id) continue;
        const cur = tally.get(id) ?? { total: 0, failed: 0 };
        cur.total++;
        if (r.status !== "success") cur.failed++;
        tally.set(id, cur);
      }
      for (const [companyId, v] of tally) {
        if (v.total > 10 && v.failed / v.total > 0.25) {
          await fireIncident(admin, {
            rule: "ai_failure_burst",
            severity: "critical",
            targetType: "company",
            targetId: companyId,
            summary: `${v.failed}/${v.total} AI attempts failed in the last hour (${Math.round((v.failed / v.total) * 100)}%)`,
            details: { total: v.total, failed: v.failed },
            firedAt: nowIso,
          });
          fired.push({ rule: "ai_failure_burst", target: companyId });
        }
      }
    }

    // --- suspicious_upload ---
    const { data: recent } = await admin
      .from("candidates")
      .select("job_posting_id, created_at")
      .gte("created_at", tenMinAgo);
    if (recent) {
      const count = new Map<string, number>();
      for (const r of recent) {
        const id = r.job_posting_id as string | null;
        if (!id) continue;
        count.set(id, (count.get(id) ?? 0) + 1);
      }
      for (const [postingId, n] of count) {
        if (n > 50) {
          const { data: posting } = await admin
            .from("job_postings")
            .select("company_id, title")
            .eq("id", postingId)
            .maybeSingle();
          if (posting) {
            await fireIncident(admin, {
              rule: "suspicious_upload",
              severity: "warn",
              targetType: "company",
              targetId: posting.company_id as string,
              summary: `${n} candidates in < 10 min on posting "${(posting.title as string) ?? postingId}"`,
              details: { posting_id: postingId, count: n },
              firedAt: nowIso,
            });
            fired.push({ rule: "suspicious_upload", target: posting.company_id as string });
          }
        }
      }
    }

    logger.info({ fired: fired.length }, "[cron/detect-incidents] ok");
    return NextResponse.json({ ok: true, fired });
  } catch (err) {
    logger.error({ err }, "[cron/detect-incidents] failed");
    return NextResponse.json({ error: "detect_failed" }, { status: 500 });
  }
}

async function fireIncident(
  admin: ReturnType<typeof createAdminClient>,
  args: {
    rule: string;
    severity: "info" | "warn" | "critical";
    targetType: "company" | "user" | "platform";
    targetId: string | null;
    summary: string;
    details: Record<string, unknown>;
    firedAt: string;
  },
): Promise<void> {
  // Respect per-tenant mutes.
  const { data: rule } = await admin
    .from("operator_alert_rules")
    .select("muted_until, muted_for_tenants, enabled")
    .eq("id", args.rule)
    .maybeSingle();
  if (!rule?.enabled) return;
  if (rule.muted_until && Date.parse(rule.muted_until as string) > Date.now()) return;
  const perTenant = (rule.muted_for_tenants as Record<string, string> | null) ?? {};
  if (args.targetId && perTenant[args.targetId]) {
    if (Date.parse(perTenant[args.targetId]) > Date.now()) return;
  }

  // Upsert on the partial unique index: if a firing incident exists, bump last_fired_at.
  const { data: existing } = await admin
    .from("operator_incidents")
    .select("id")
    .eq("rule_id", args.rule)
    .eq("status", "firing")
    .eq("target_id", args.targetId as string)
    .maybeSingle();

  if (existing) {
    await admin
      .from("operator_incidents")
      .update({ last_fired_at: args.firedAt, summary: args.summary, details: args.details })
      .eq("id", existing.id);
  } else {
    await admin.from("operator_incidents").insert({
      rule_id: args.rule,
      severity: args.severity,
      target_type: args.targetType,
      target_id: args.targetId,
      summary: args.summary,
      details: args.details,
    });
  }
}
