import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { extractRequestContext, writeOperatorAudit } from "@/lib/operator/audit-log";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = createAdminClient();

    // Find the active impersonation session where this user is the target
    const { data: session } = await admin
      .from("impersonation_sessions")
      .select("id, operator_id, target_user_id")
      .eq("target_user_id", user.id)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!session) {
      return NextResponse.json({ error: "No active impersonation session" }, { status: 404 });
    }

    // Close the session
    await admin
      .from("impersonation_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", session.id);

    // Get operator email for magic link sign-back
    const { data: operatorProfile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", session.operator_id)
      .single();

    let signBackUrl: string | null = null;

    if (operatorProfile) {
      const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: operatorProfile.email,
      });

      if (!linkError && linkData) {
        const verifyUrl = new URL("/auth/callback", env.APP_URL);
        verifyUrl.searchParams.set("token_hash", linkData.properties.hashed_token);
        verifyUrl.searchParams.set("type", "magiclink");
        verifyUrl.searchParams.set("next", "/operator");
        signBackUrl = verifyUrl.toString();
      }
    }

    const { ip, userAgent } = extractRequestContext(request.headers);
    await writeOperatorAudit({
      actorUserId: session.operator_id,
      action: "operator.impersonate.end",
      targetUserId: session.target_user_id,
      metadata: { session_id: session.id },
      ip,
      userAgent,
    });

    logger.info(
      { operator: session.operator_id, target: session.target_user_id, sessionId: session.id },
      "[api/operator/impersonate/end] impersonation ended",
    );

    // Sign the current user out (the impersonated session)
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      signBackUrl,
    });
  } catch (err) {
    logger.error({ err }, "[api/operator/impersonate/end] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
