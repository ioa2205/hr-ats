import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { changeRoleSchema } from "@/lib/validations/team";
import { logger } from "@/lib/logger";

export async function PATCH(request: NextRequest) {
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

  const parsed = changeRoleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { user_id, role } = parsed.data;
  const admin = createAdminClient();

  // Cannot change your own role
  if (user_id === access.user.id) {
    return NextResponse.json({ error: "cannot_change_self" }, { status: 400 });
  }

  // Look up the target member
  const { data: target } = await admin
    .from("company_members")
    .select("role")
    .eq("company_id", access.companyId)
    .eq("user_id", user_id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "member_not_found" }, { status: 404 });
  }

  // Cannot change the owner's role (only DB-level constraint allows one owner)
  if (target.role === "owner") {
    return NextResponse.json({ error: "cannot_change_owner" }, { status: 403 });
  }

  // Admins cannot change other admins — only owners can
  if (access.role === "admin" && target.role === "admin") {
    return NextResponse.json({ error: "insufficient_role" }, { status: 403 });
  }

  const { error } = await admin
    .from("company_members")
    .update({ role })
    .eq("company_id", access.companyId)
    .eq("user_id", user_id);

  if (error) {
    logger.error({ err: error.message }, "[api/hr/team/change-role] update failed");
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: access.user.id,
    company_id: access.companyId,
    actor: "hr",
    action: "settings.team.role_changed",
    entity_type: "company_member",
    entity_id: user_id,
    metadata: { from: target.role, to: role },
  });

  logger.info(
    { company_id: access.companyId, user_id, from: target.role, to: role },
    "[team] role changed",
  );

  return NextResponse.json({ ok: true });
}
