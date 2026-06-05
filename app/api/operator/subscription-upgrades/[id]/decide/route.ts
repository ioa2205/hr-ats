import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { extractRequestContext, writeOperatorAudit } from "@/lib/operator/audit-log";

const schema = z.object({
  decision: z.enum(["approve", "reject"]),
  note: z.string().trim().max(2000).optional(),
});

interface UpgradeRequestRow {
  id: string;
  company_id: string;
  requested_by: string;
  plan_id: string;
  status: string;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireOperatorApi({ write: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }

  const { id } = await params;
  const idParsed = z.string().uuid().safeParse(id);
  if (!idParsed.success) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: requestRow } = await admin
    .from("subscription_upgrade_requests")
    .select("id, company_id, requested_by, plan_id, status")
    .eq("id", id)
    .maybeSingle();

  const upgrade = requestRow as UpgradeRequestRow | null;
  if (!upgrade) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (upgrade.status !== "pending") {
    return NextResponse.json({ error: "already_decided" }, { status: 409 });
  }

  const { data: plan } = await admin
    .from("subscription_plans")
    .select("id, code, active")
    .eq("id", upgrade.plan_id)
    .maybeSingle();

  if (!plan || !plan.active) {
    return NextResponse.json({ error: "plan_not_found" }, { status: 404 });
  }

  const approve = parsed.data.decision === "approve";
  const now = new Date();
  const nowIso = now.toISOString();
  const nextStatus = approve ? "approved" : "rejected";
  const operatorNote = parsed.data.note?.trim() || null;

  const { data: claimed, error: claimErr } = await admin
    .from("subscription_upgrade_requests")
    .update({
      status: nextStatus,
      approver_user_id: auth.user.id,
      operator_note: operatorNote,
      decided_at: nowIso,
    })
    .eq("id", id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (claimErr || !claimed) {
    return NextResponse.json({ error: "already_decided" }, { status: 409 });
  }

  if (approve) {
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { data: activatedSub, error: subErr } = await admin
      .from("subscriptions")
      .update({
        status: "active",
        plan_id: upgrade.plan_id,
        current_period_end: periodEnd.toISOString(),
        grace_period_ends_at: null,
        pro_started_at: nowIso,
        pro_renews_at: periodEnd.toISOString(),
        updated_at: nowIso,
      })
      .eq("company_id", upgrade.company_id)
      .select("company_id")
      .maybeSingle();

    if (subErr || !activatedSub) {
      await admin
        .from("subscription_upgrade_requests")
        .update({
          status: "pending",
          approver_user_id: null,
          operator_note: null,
          decided_at: null,
        })
        .eq("id", id);
      logger.error(
        { err: subErr, requestId: id, companyId: upgrade.company_id },
        "[operator/subscription-upgrades] activate failed",
      );
      return NextResponse.json({ error: "activation_failed" }, { status: 500 });
    }

    await admin
      .from("subscription_upgrade_requests")
      .update({
        status: "cancelled",
        approver_user_id: auth.user.id,
        operator_note: "Superseded by approved Pro request",
        decided_at: nowIso,
      })
      .eq("company_id", upgrade.company_id)
      .eq("status", "pending")
      .neq("id", id);
  }

  await admin.from("audit_log").insert({
    company_id: upgrade.company_id,
    actor: "operator",
    actor_user_id: auth.user.id,
    action: approve
      ? "operator.subscription_upgrade.approve"
      : "operator.subscription_upgrade.reject",
    entity_type: "subscription_upgrade_request",
    entity_id: id,
    metadata: {
      requested_by: upgrade.requested_by,
      plan_code: plan.code,
      note: operatorNote,
    },
  });

  const { ip, userAgent } = extractRequestContext(req.headers);
  await writeOperatorAudit({
    actorUserId: auth.user.id,
    action: approve
      ? "operator.subscription_upgrade.approve"
      : "operator.subscription_upgrade.reject",
    targetCompanyId: upgrade.company_id,
    targetUserId: upgrade.requested_by,
    metadata: {
      request_id: id,
      plan_code: plan.code,
      note: operatorNote,
    },
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true, status: nextStatus });
}
