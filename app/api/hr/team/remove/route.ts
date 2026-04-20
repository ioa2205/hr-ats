import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { removeMemberSchema } from "@/lib/validations/team";
import { logger } from "@/lib/logger";

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

  const parsed = removeMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { user_id } = parsed.data;
  const admin = createAdminClient();

  // Cannot remove yourself
  if (user_id === access.user.id) {
    return NextResponse.json({ error: "cannot_remove_self" }, { status: 400 });
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

  // Cannot remove the owner
  if (target.role === "owner") {
    return NextResponse.json({ error: "cannot_remove_owner" }, { status: 403 });
  }

  // Admins cannot remove other admins — only owners can
  if (access.role === "admin" && target.role === "admin") {
    return NextResponse.json({ error: "insufficient_role" }, { status: 403 });
  }

  const { error } = await admin
    .from("company_members")
    .delete()
    .eq("company_id", access.companyId)
    .eq("user_id", user_id);

  if (error) {
    logger.error({ err: error.message }, "[api/hr/team/remove] delete failed");
    return NextResponse.json({ error: "remove_failed" }, { status: 500 });
  }

  // If the removed user had this company as their current, clear it
  await admin
    .from("profiles")
    .update({ current_company_id: null })
    .eq("id", user_id)
    .eq("current_company_id", access.companyId);

  await admin.from("audit_log").insert({
    actor_user_id: access.user.id,
    company_id: access.companyId,
    actor: "hr",
    action: "settings.team.member_removed",
    entity_type: "company_member",
    entity_id: user_id,
    metadata: { role: target.role },
  });

  logger.info(
    { company_id: access.companyId, user_id, role: target.role },
    "[team] member removed",
  );

  return NextResponse.json({ ok: true });
}
