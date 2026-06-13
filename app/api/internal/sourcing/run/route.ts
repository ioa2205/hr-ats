import { NextResponse, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod/v4";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runSourcingSearch } from "@/lib/sourcing/run";
import { recordWorkerHeartbeat, WORKER } from "@/lib/observability/heartbeat";

// Background worker route. Invoked by the pickup / stuck-run pg_cron job and by
// the trigger's fire-and-forget kick. Authenticated with the service-role key.
//
// The funnel runs INLINE within this request (not in after()) so the heavy,
// multi-minute work executes inside an active request — the reliable execution
// context on Railway's persistent server. Callers don't wait for the body:
// pg_net fires async, and the trigger's kick aborts its wait after a few
// seconds while this handler keeps running to completion. A crash mid-run
// leaves the search in 'running'; the stale-run cron re-invokes and
// claim_sourcing_search resumes or, past MAX_ATTEMPTS, fails it loudly.
export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({ searchId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let searchId: string;
  try {
    searchId = Body.parse(await request.json()).searchId;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  try {
    await runSourcingSearch(searchId);
    await recordWorkerHeartbeat(WORKER.sourcingRun, true);
    return NextResponse.json({ ok: true, done: true }, { status: 200 });
  } catch (err) {
    logger.error({ err: String(err), searchId }, "[sourcing] worker run crashed");
    Sentry.captureException(err, { tags: { worker: WORKER.sourcingRun }, extra: { searchId } });
    await recordWorkerHeartbeat(WORKER.sourcingRun, false, String(err));
    return NextResponse.json({ error: "run_failed" }, { status: 500 });
  }
}
