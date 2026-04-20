import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const schema = z.object({
  kind: z.enum(["promote", "demote"]),
  reason: z.string().trim().min(10).max(1000),
});

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
  const { id: targetUserId } = await params;

  if (targetUserId === auth.user.id) {
    return NextResponse.json({ error: "self_action_forbidden" }, { status: 400 });
  }

  const admin = createAdminClient();

  // For demote: block if the target is the last operator.
  if (parsed.data.kind === "demote") {
    const { count } = await admin
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_operator", true);
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "cannot_demote_last_operator" }, { status: 400 });
    }
  }

  const { data, error } = await admin
    .from("pending_operator_promotions")
    .insert({
      target_user_id: targetUserId,
      proposer_user_id: auth.user.id,
      kind: parsed.data.kind,
      reason: parsed.data.reason,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_pending" }, { status: 409 });
    }
    logger.error({ err: error }, "[api/operator/users/promote] insert failed");
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    action:
      parsed.data.kind === "promote"
        ? "operator.promotion_proposed"
        : "operator.demotion_proposed",
    entity_type: "user",
    entity_id: targetUserId,
    metadata: { promotion_id: Number(data.id), reason: parsed.data.reason },
  });

  return NextResponse.json({ id: Number(data.id) });
}
