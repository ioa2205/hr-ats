import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import { z } from "zod";

const bodySchema = z.object({
  targetUserId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await requireOperatorApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const { targetUserId, reason } = parsed.data;

    if (targetUserId === auth.user.id) {
      return NextResponse.json({ error: "Cannot impersonate yourself" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Check the target user exists
    const { data: targetProfile } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", targetUserId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    // Close any existing active impersonation sessions for this operator,
    // then insert a new one. The partial unique index
    // impersonation_one_active_per_operator guarantees atomicity: if two
    // concurrent requests race, one insert wins and the other sees 23505.
    // On collision we retry once — close again, then re-insert.
    const operatorId = auth.user.id;
    async function closeActiveSessions(): Promise<void> {
      await admin
        .from("impersonation_sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("operator_id", operatorId)
        .is("ended_at", null);
    }

    await closeActiveSessions();

    let session: { id: string } | null = null;
    let sessionError: { code?: string; message?: string } | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      const { data, error } = await admin
        .from("impersonation_sessions")
        .insert({
          operator_id: operatorId,
          target_user_id: targetUserId,
          reason,
        })
        .select("id")
        .single();

      if (!error && data) {
        session = data;
        sessionError = null;
        break;
      }
      sessionError = error;
      if (error?.code !== "23505") break;
      await closeActiveSessions();
    }

    if (!session) {
      logger.error(
        { err: sessionError?.message },
        "[api/operator/impersonate/start] session insert failed",
      );
      return NextResponse.json({ error: "Failed to create session" }, { status: 500 });
    }

    // Generate a magic link for the target user
    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: targetProfile.email,
    });

    if (linkError || !linkData) {
      // Clean up session if link generation fails
      await admin.from("impersonation_sessions").delete().eq("id", session.id);
      logger.error({ err: linkError }, "[api/operator/impersonate/start] magic link failed");
      return NextResponse.json({ error: "Failed to generate sign-in link" }, { status: 500 });
    }

    // Audit log — both operator and target IDs captured
    await admin.from("audit_log").insert({
      actor_user_id: auth.user.id,
      actor: auth.user.email ?? "operator",
      action: "impersonation.started",
      entity_type: "user",
      entity_id: targetUserId,
      metadata: {
        operator_id: auth.user.id,
        target_user_id: targetUserId,
        target_email: targetProfile.email,
        target_name: targetProfile.full_name,
        session_id: session.id,
        reason,
      },
    });

    logger.info(
      { operator: auth.user.id, target: targetUserId, sessionId: session.id },
      "[api/operator/impersonate/start] impersonation started",
    );

    // The hashed_token from generateLink is used to construct the verification URL
    const verifyUrl = new URL("/auth/callback", env.APP_URL);
    verifyUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
    verifyUrl.searchParams.set("type", "magiclink");
    verifyUrl.searchParams.set("impersonation_session", session.id);

    return NextResponse.json({
      sessionId: session.id,
      signInUrl: verifyUrl.toString(),
      targetUser: {
        id: targetProfile.id,
        email: targetProfile.email,
        fullName: targetProfile.full_name,
      },
    });
  } catch (err) {
    logger.error({ err }, "[api/operator/impersonate/start] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
