import { NextResponse, after, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/send";
import { drainNotificationRetries, createDeliveryStore } from "@/lib/notifications/retry";
import { recordWorkerHeartbeat, WORKER } from "@/lib/observability/heartbeat";

// Background worker route. Invoked every minute by the dispatch-notification-
// retries pg_cron job (service-role bearer, verified below). Re-sends queued
// (quiet-hours) and failed email deliveries past their next_retry_at. Runs in
// after() so the cron's pg_net call gets a fast 202.
export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  after(async () => {
    try {
      const admin = createAdminClient();
      await drainNotificationRetries({
        store: createDeliveryStore(admin),
        send: sendEmail,
        now: () => new Date(),
        logger,
      });
      await recordWorkerHeartbeat(WORKER.notificationRetry, true);
    } catch (err) {
      logger.error({ err: String(err) }, "[notifications] retry worker crashed");
      Sentry.captureException(err, { tags: { worker: WORKER.notificationRetry } });
      await recordWorkerHeartbeat(WORKER.notificationRetry, false, String(err));
    }
  });

  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}
