import "server-only";

import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Fire the background sourcing worker for one search WITHOUT waiting for the
 * (multi-minute) funnel to finish.
 *
 * The worker route runs the funnel INLINE within its own request, so it keeps
 * processing on the persistent server even after we stop waiting here. We give
 * the kick a short timeout purely to dispatch the request, then swallow the
 * expected AbortError. This mirrors the CV-analysis pattern (a quick kick that
 * hands off to a separate long-running execution) instead of running the whole
 * funnel inside the page request's `after()`, which the host can cut short.
 *
 * The pickup pg_cron remains the backstop if this kick never lands.
 */
export async function kickSourcingWorker(searchId: string): Promise<void> {
  try {
    await fetch(`${env.APP_URL}/api/internal/sourcing/run`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ searchId }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    // Aborting the wait is expected — the worker keeps running server-side.
    if (err instanceof DOMException && err.name === "TimeoutError") return;
    if (err instanceof Error && err.name === "AbortError") return;
    logger.error({ err: String(err), searchId }, "[sourcing] worker kick failed");
  }
}
