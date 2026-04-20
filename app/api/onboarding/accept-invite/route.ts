import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { acceptInviteSchema } from "@/lib/validations/onboarding";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = acceptInviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const { token } = parsed.data;
  const admin = createAdminClient();

  // Look up the invite by token
  const { data: invite, error: inviteError } = await admin
    .from("company_invites")
    .select("id, company_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  }

  // Check if already accepted
  if (invite.accepted_at) {
    return NextResponse.json({ error: "invite_used" }, { status: 409 });
  }

  // Check expiry
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "invite_expired" }, { status: 410 });
  }

  // Enforce invite email matches the authenticated user's email.
  // Why: invites are issued to a specific address; without this check any
  // authenticated user who learns the token can join the invited company.
  const inviteEmail = invite.email?.toLowerCase().trim() ?? "";
  const userEmail = user.email?.toLowerCase().trim() ?? "";
  if (!inviteEmail || !userEmail || inviteEmail !== userEmail) {
    logger.warn(
      { invite_id: invite.id, user_id: user.id },
      "[onboarding] accept invite: email mismatch",
    );
    return NextResponse.json({ error: "invite_email_mismatch" }, { status: 403 });
  }

  // Check if user is already a member of this company
  const { data: existingMember } = await admin
    .from("company_members")
    .select("user_id")
    .eq("company_id", invite.company_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMember) {
    return NextResponse.json({ error: "already_member" }, { status: 409 });
  }

  // Add user to company with the invited role
  const { error: memberError } = await admin.from("company_members").insert({
    company_id: invite.company_id,
    user_id: user.id,
    role: invite.role,
  });

  if (memberError) {
    logger.error({ err: memberError.message }, "[onboarding] accept invite: member insert failed");
    return NextResponse.json({ error: "accept_failed" }, { status: 500 });
  }

  // Mark invite as accepted
  await admin
    .from("company_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id);

  // Set current_company_id on profile
  const { error: profileError } = await admin
    .from("profiles")
    .update({ current_company_id: invite.company_id })
    .eq("id", user.id);

  if (profileError) {
    logger.error(
      { err: profileError.message },
      "[onboarding] accept invite: profile update failed",
    );
  }

  // Audit log
  await admin.from("audit_log").insert({
    actor_user_id: user.id,
    company_id: invite.company_id,
    action: "member.joined_via_invite",
    entity_type: "company_member",
    entity_id: user.id,
    metadata: { invite_id: invite.id, role: invite.role },
  });

  logger.info(
    {
      company_id: invite.company_id,
      user_id: user.id,
      role: invite.role,
    },
    "[onboarding] invite accepted",
  );

  return NextResponse.json({ company_id: invite.company_id }, { status: 200 });
}
