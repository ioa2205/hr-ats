import type { createAdminClient } from "@/lib/supabase/admin";
import type { SendResult } from "@/lib/email/send";
import { computeNextRetryAt } from "./dispatch";

/**
 * Drains queued (quiet-hours) and failed email deliveries from
 * notification_deliveries. Invoked every minute by the Next.js worker route
 * (app/api/internal/notifications/dispatch-retries) that the
 * dispatch-notification-retries cron calls — see migration 380.
 *
 * Crash-safety: a row is only marked terminal after its send resolves. If the
 * worker dies mid-batch, untouched rows keep their (past-due) next_retry_at and
 * the next cron tick re-picks them. Semantics are therefore at-least-once: a
 * crash between a successful send and the row update can re-send one email,
 * which is benign for notifications.
 */

export const MAX_DELIVERY_ATTEMPTS = 3;
const DEFAULT_BATCH_SIZE = 50;

export interface DueDelivery {
  id: string;
  recipient_email: string;
  subject: string;
  body_html: string | null;
  attempts: number;
}

export interface DeliveryStore {
  loadDue(nowIso: string, limit: number): Promise<DueDelivery[]>;
  isSuppressed(email: string): Promise<boolean>;
  markSent(id: string, attempts: number, messageId: string | null, nowIso: string): Promise<void>;
  markFailed(id: string, attempts: number, error: string, nextRetryIso: string | null): Promise<void>;
  markSuppressed(id: string, error: string): Promise<void>;
}

export interface RetryDeps {
  store: DeliveryStore;
  send: (args: { to: string; subject: string; html: string }) => Promise<SendResult>;
  now: () => Date;
  logger: { info: (o: object, m: string) => void; error: (o: object, m: string) => void };
  batchSize?: number;
}

export interface RetrySummary {
  picked: number;
  sent: number;
  failed: number;
  exhausted: number;
  suppressed: number;
  skippedNoBody: number;
}

export async function drainNotificationRetries(deps: RetryDeps): Promise<RetrySummary> {
  const { store, send, now, logger } = deps;
  const batchSize = deps.batchSize ?? DEFAULT_BATCH_SIZE;
  const nowDate = now();
  const nowIso = nowDate.toISOString();

  const rows = await store.loadDue(nowIso, batchSize);
  const summary: RetrySummary = {
    picked: rows.length,
    sent: 0,
    failed: 0,
    exhausted: 0,
    suppressed: 0,
    skippedNoBody: 0,
  };

  for (const row of rows) {
    if (await store.isSuppressed(row.recipient_email)) {
      await store.markSuppressed(row.id, "address in notification_suppressions");
      summary.suppressed++;
      continue;
    }

    // Legacy rows created before body_html existed cannot be re-rendered; fail
    // them terminally so they stop occupying the retry queue forever.
    if (!row.body_html) {
      await store.markFailed(row.id, row.attempts, "no_body_html", null);
      summary.skippedNoBody++;
      continue;
    }

    const attempts = row.attempts + 1;
    const result = await send({
      to: row.recipient_email,
      subject: row.subject,
      html: row.body_html,
    });

    if (result.ok) {
      await store.markSent(row.id, attempts, result.messageId ?? null, nowIso);
      summary.sent++;
      continue;
    }

    const exhausted = attempts >= MAX_DELIVERY_ATTEMPTS;
    await store.markFailed(
      row.id,
      attempts,
      result.error ?? "unknown",
      exhausted ? null : computeNextRetryAt(attempts, nowDate).toISOString(),
    );
    if (exhausted) summary.exhausted++;
    else summary.failed++;
  }

  logger.info({ ...summary }, "[notifications] retry drain complete");
  return summary;
}

/** Builds the production DeliveryStore over the service-role admin client. */
export function createDeliveryStore(admin: ReturnType<typeof createAdminClient>): DeliveryStore {
  return {
    async loadDue(nowIso, limit) {
      const { data } = await admin
        .from("notification_deliveries")
        .select("id, recipient_email, subject, body_html, attempts")
        .in("status", ["queued", "failed"])
        .not("next_retry_at", "is", null)
        .lte("next_retry_at", nowIso)
        .order("next_retry_at", { ascending: true })
        .limit(limit);
      return (data ?? []) as DueDelivery[];
    },
    async isSuppressed(email) {
      const { data } = await admin
        .from("notification_suppressions")
        .select("email")
        .eq("email", email)
        .maybeSingle();
      return Boolean(data);
    },
    async markSent(id, attempts, messageId, nowIso) {
      await admin
        .from("notification_deliveries")
        .update({
          status: "sent",
          attempts,
          sent_at: nowIso,
          resend_message_id: messageId,
          next_retry_at: null,
          last_error: null,
        })
        .eq("id", id);
    },
    async markFailed(id, attempts, error, nextRetryIso) {
      await admin
        .from("notification_deliveries")
        .update({
          status: "failed",
          attempts,
          last_error: error.slice(0, 500),
          next_retry_at: nextRetryIso,
        })
        .eq("id", id);
    },
    async markSuppressed(id, error) {
      await admin
        .from("notification_deliveries")
        .update({ status: "suppressed", last_error: error, next_retry_at: null })
        .eq("id", id);
    },
  };
}
