import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { redactSecrets } from "@/lib/security/redact";

/** Canonical worker identifiers recorded in worker_heartbeats. */
export const WORKER = {
  sourcingRun: "sourcing-run",
  telegramIngest: "telegram-ingest",
  notificationRetry: "notification-retry",
  // process-cv is the Deno Edge Function; it records its own heartbeat by
  // calling record_worker_heartbeat directly. Listed here for the canonical
  // name + so the operator dashboard label map stays in one mental model.
  processCv: "process-cv",
} as const;

export type WorkerName = (typeof WORKER)[keyof typeof WORKER];

/**
 * Record a background-worker run outcome (migration 390). A successful run
 * clears the failure streak; a failure increments it and stores the message.
 * Best-effort: a heartbeat write must never mask the worker's own result, so
 * failures here are logged and swallowed.
 */
export async function recordWorkerHeartbeat(
  worker: WorkerName,
  ok: boolean,
  error?: string,
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error: rpcErr } = await admin.rpc("record_worker_heartbeat", {
      p_worker: worker,
      p_ok: ok,
      // Redact before storing — worker error text can echo provider API keys.
      p_error: error ? redactSecrets(error).slice(0, 500) : null,
    });
    if (rpcErr) {
      logger.error({ err: rpcErr, worker }, "[heartbeat] record failed");
    }
  } catch (err) {
    logger.error({ err: String(err), worker }, "[heartbeat] record threw");
  }
}
