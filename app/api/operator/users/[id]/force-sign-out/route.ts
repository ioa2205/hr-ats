import { NextResponse, type NextRequest } from "next/server";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: targetId } = await params;
  const admin = createAdminClient();

  const { error } = await admin.auth.admin.signOut(targetId, "global");
  if (error) {
    logger.error({ err: error }, "[api/operator/users/force-sign-out] failed");
    return NextResponse.json({ error: "sign_out_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    action: "operator.force_sign_out",
    entity_type: "user",
    entity_id: targetId,
    metadata: { scope: "global" },
  });

  return NextResponse.json({ ok: true });
}
