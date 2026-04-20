import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

const schema = z.object({ invite_id: z.uuid() });

export async function POST(request: NextRequest) {
  const access = await requireCompanyAccessApi({
    roles: ["owner", "admin"],
    requireWrite: true,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("company_invites")
    .select("id, email, accepted_at")
    .eq("id", parsed.data.invite_id)
    .eq("company_id", access.companyId)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (invite.accepted_at) {
    return NextResponse.json({ error: "already_accepted" }, { status: 409 });
  }

  const { error } = await admin.from("company_invites").delete().eq("id", invite.id);

  if (error) {
    logger.error({ err: error.message }, "[api/hr/team/revoke-invite] delete failed");
    return NextResponse.json({ error: "revoke_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: access.user.id,
    company_id: access.companyId,
    actor: "hr",
    action: "settings.team.invite_revoked",
    entity_type: "company_invite",
    entity_id: invite.id,
    metadata: { email: invite.email },
  });

  return NextResponse.json({ ok: true });
}
