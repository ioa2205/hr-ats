import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function GET() {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id, email, full_name, operator_role, updated_at")
    .eq("is_operator", true)
    .order("email");
  return NextResponse.json({ data: data ?? [] });
}

const patchSchema = z.object({
  targetUserId: z.string().uuid(),
  operatorRole: z.enum(["full", "read_only"]),
  reason: z.string().trim().min(10).max(1000),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireOperatorApi({ write: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_failed" }, { status: 400 });

  if (parsed.data.targetUserId === auth.user.id) {
    return NextResponse.json({ error: "self_role_change_forbidden" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("profiles")
    .select("operator_role")
    .eq("id", parsed.data.targetUserId)
    .maybeSingle();

  const { error } = await admin
    .from("profiles")
    .update({ operator_role: parsed.data.operatorRole })
    .eq("id", parsed.data.targetUserId);
  if (error) {
    logger.error({ err: error }, "[api/operator/team] role change failed");
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  // Mirror operator_role into auth.users.raw_app_meta_data so JWT claims
  // carry it on next token refresh. Migration 140 deliberately skipped a
  // PL/pgSQL trigger for this (Supabase Studio splits on `;` inside dollar
  // quotes) — we do it from TS instead. `is_operator` is still synced by
  // the sync_operator_jwt_claim trigger from migration 018.
  const { data: authUser } = await admin.auth.admin.getUserById(parsed.data.targetUserId);
  if (authUser?.user) {
    const prevMeta = (authUser.user.app_metadata ?? {}) as Record<string, unknown>;
    await admin.auth.admin.updateUserById(parsed.data.targetUserId, {
      app_metadata: { ...prevMeta, operator_role: parsed.data.operatorRole },
    });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    action: "operator.role_changed",
    entity_type: "user",
    entity_id: parsed.data.targetUserId,
    metadata: {
      before: before?.operator_role ?? null,
      after: parsed.data.operatorRole,
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json({ ok: true });
}
