import { NextResponse, type NextRequest } from "next/server";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOperatorApi({ write: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: targetId } = await params;
  const admin = createAdminClient();

  const { data: target } = await admin
    .from("profiles")
    .select("email")
    .eq("id", targetId)
    .maybeSingle();
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email: target.email as string,
  });
  if (error) {
    logger.error({ err: error }, "[api/operator/users/reset-password] generateLink failed");
    return NextResponse.json({ error: "reset_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    action: "operator.password_reset_sent",
    entity_type: "user",
    entity_id: targetId,
    metadata: { target_email: target.email },
  });

  return NextResponse.json({ ok: true });
}
