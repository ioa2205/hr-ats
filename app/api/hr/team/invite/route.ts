import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { sendInviteSchema } from "@/lib/validations/team";
import { sendInviteEmail } from "@/lib/email/invite";
import { env } from "@/lib/env";
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

  const parsed = sendInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { email, role } = parsed.data;
  const admin = createAdminClient();

  // Check if user is already a member of this company
  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingProfile) {
    const { data: existingMember } = await admin
      .from("company_members")
      .select("user_id")
      .eq("company_id", access.companyId)
      .eq("user_id", existingProfile.id)
      .maybeSingle();

    if (existingMember) {
      return NextResponse.json({ error: "already_member" }, { status: 409 });
    }
  }

  // Check for an existing pending invite to this email for this company
  const { data: existingInvite } = await admin
    .from("company_invites")
    .select("id, accepted_at, expires_at")
    .eq("company_id", access.companyId)
    .eq("email", email)
    .maybeSingle();

  if (existingInvite) {
    if (existingInvite.accepted_at) {
      return NextResponse.json({ error: "already_member" }, { status: 409 });
    }
    // If pending and not expired, resend by deleting and re-creating
    await admin.from("company_invites").delete().eq("id", existingInvite.id);
  }

  // Create the invite
  const { data: invite, error } = await admin
    .from("company_invites")
    .insert({
      company_id: access.companyId,
      email,
      role,
      invited_by: access.user.id,
    })
    .select("id, token")
    .single();

  if (error) {
    logger.error({ err: error.message }, "[api/hr/team/invite] insert failed");
    return NextResponse.json({ error: "invite_failed" }, { status: 500 });
  }

  // Build invite URL
  const inviteUrl = `${env.APP_URL}/auth/accept-invite/${invite.token}`;

  // Get inviter name for the email
  const { data: inviterProfile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", access.user.id)
    .single();

  // Get company name for the email
  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", access.companyId)
    .single();

  // Send invite email (non-blocking — failure doesn't prevent invite creation)
  void sendInviteEmail({
    to: email,
    companyName: company?.name ?? "your company",
    role,
    inviteUrl,
    inviterName: inviterProfile?.full_name ?? "A teammate",
  });

  // Audit log
  await admin.from("audit_log").insert({
    actor_user_id: access.user.id,
    company_id: access.companyId,
    actor: "hr",
    action: "settings.team.invite_created",
    entity_type: "company_invite",
    entity_id: invite.id,
    metadata: { email, role },
  });

  logger.info(
    { company_id: access.companyId, email, role, invite_id: invite.id },
    "[team] invite created",
  );

  return NextResponse.json(
    { invite_id: invite.id, token: invite.token, invite_url: inviteUrl },
    { status: 201 },
  );
}
