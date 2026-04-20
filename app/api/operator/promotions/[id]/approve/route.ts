import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { extractRequestContext, writeOperatorAudit } from "@/lib/operator/audit-log";

const schema = z.object({ decision: z.enum(["approve", "reject"]) });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }
  const { id: rawId } = await params;
  const promotionId = Number(rawId);
  if (!Number.isFinite(promotionId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: promotion } = await admin
    .from("pending_operator_promotions")
    .select("id, target_user_id, proposer_user_id, kind, status")
    .eq("id", promotionId)
    .maybeSingle();

  if (!promotion) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (promotion.status !== "pending") {
    return NextResponse.json({ error: "already_decided" }, { status: 409 });
  }
  if (promotion.proposer_user_id === auth.user.id) {
    return NextResponse.json({ error: "cannot_self_approve" }, { status: 403 });
  }

  const approve = parsed.data.decision === "approve";
  const nextStatus = approve ? "approved" : "rejected";

  // Apply the side-effect if approved: flip is_operator on the target.
  if (approve) {
    const nextIsOp = promotion.kind === "promote";
    const { error: profErr } = await admin
      .from("profiles")
      .update({ is_operator: nextIsOp })
      .eq("id", promotion.target_user_id as string);
    if (profErr) {
      logger.error({ err: profErr }, "[promotions/approve] profile flip failed");
      return NextResponse.json({ error: "apply_failed" }, { status: 500 });
    }
  }

  const { error: promErr } = await admin
    .from("pending_operator_promotions")
    .update({
      status: nextStatus,
      approver_user_id: auth.user.id,
      decided_at: new Date().toISOString(),
    })
    .eq("id", promotionId);
  if (promErr) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  const { ip, userAgent } = extractRequestContext(req.headers);
  await writeOperatorAudit({
    actorUserId: auth.user.id,
    action: approve ? "operator.promotion.approve" : "operator.promotion.reject",
    targetUserId: promotion.target_user_id as string,
    metadata: {
      promotion_id: promotionId,
      proposer_user_id: promotion.proposer_user_id,
      kind: promotion.kind,
    },
    ip,
    userAgent,
  });

  return NextResponse.json({ ok: true, status: nextStatus });
}
