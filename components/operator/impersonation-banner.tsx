import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  IMPERSONATION_MAX_MS,
  isSessionStale,
} from "@/lib/operator/impersonation";
import { ImpersonationBannerView } from "./impersonation-banner-view";

/**
 * Returns true when the stale session was expired and closed. Extracted from
 * the component body so the Date.now() call sits in a plain async function
 * rather than the React render path.
 */
async function expireIfStale(
  admin: ReturnType<typeof createAdminClient>,
  session: {
    id: string;
    operator_id: string;
    target_user_id: string;
    started_at: string;
  },
): Promise<boolean> {
  const nowMs = Date.now();
  if (!isSessionStale(session.started_at, nowMs)) return false;

  const endedAt = new Date(nowMs).toISOString();
  await admin.from("impersonation_sessions").update({ ended_at: endedAt }).eq("id", session.id);
  await admin.from("audit_log").insert({
    actor_user_id: session.operator_id,
    actor: "system",
    action: "impersonation.expired",
    entity_type: "user",
    entity_id: session.target_user_id,
    metadata: {
      operator_id: session.operator_id,
      target_user_id: session.target_user_id,
      session_id: session.id,
      expired_after_ms: IMPERSONATION_MAX_MS,
    },
  });
  logger.info(
    { sessionId: session.id, operator: session.operator_id, target: session.target_user_id },
    "[operator/impersonation-banner] expired stale session",
  );
  return true;
}

export async function ImpersonationBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("impersonation_sessions")
    .select("id, operator_id, target_user_id, started_at")
    .eq("target_user_id", user.id)
    .is("ended_at", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!session) return null;

  // Server-side 60-minute hard expiry. If a stale session slipped past the
  // client-side countdown (tab backgrounded, network flap, etc.) close it
  // here and write the audit row so the next page-load is clean.
  if (await expireIfStale(admin, session)) return null;

  const [{ data: target }, { data: operator }] = await Promise.all([
    admin.from("profiles").select("email, full_name").eq("id", session.target_user_id).single(),
    admin.from("profiles").select("email, full_name").eq("id", session.operator_id).single(),
  ]);

  const targetLabel = target?.full_name || target?.email || "user";
  const operatorLabel = operator?.full_name || operator?.email || "operator";

  return (
    <ImpersonationBannerView
      targetLabel={targetLabel}
      operatorLabel={operatorLabel}
      startedAt={session.started_at}
    />
  );
}
