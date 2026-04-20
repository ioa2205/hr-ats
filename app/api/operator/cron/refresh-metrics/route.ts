import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Refreshes `operator_daily_metrics`. Gated by a shared secret so external
 * schedulers (Railway cron, pg_cron, GitHub Actions) can hit it without a
 * session. In dev without CRON_SECRET set, allow localhost requests only.
 *
 * Expected usage: POST with header `x-cron-secret: $CRON_SECRET`.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");

  if (secret) {
    if (provided !== secret) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  } else if (process.env.NODE_ENV === "production") {
    logger.warn("[cron/refresh-metrics] CRON_SECRET not set in production");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const admin = createAdminClient();
  const started = Date.now();
  try {
    // Concurrent refresh keeps the dashboard readable while this runs.
    const { error } = await admin.rpc("refresh_operator_daily_metrics");
    if (error) throw error;
    const durationMs = Date.now() - started;
    logger.info({ durationMs }, "[cron/refresh-metrics] ok");
    return NextResponse.json({ ok: true, durationMs });
  } catch (err) {
    logger.error({ err }, "[cron/refresh-metrics] failed");
    return NextResponse.json({ error: "refresh_failed" }, { status: 500 });
  }
}
