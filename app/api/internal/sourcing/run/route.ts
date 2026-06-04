import { NextResponse, after, type NextRequest } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod/v4";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { runSourcingSearch } from "@/lib/sourcing/run";
import { recordWorkerHeartbeat, WORKER } from "@/lib/observability/heartbeat";

// Background worker route. Invoked by the pickup / stuck-run pg_cron job and by
// the trigger's immediate kick. Authenticated with the service-role key (the
// cron sends it as a bearer). Long-running on Railway's persistent server; the
// funnel runs in after() so the caller (pg_net / the trigger) gets a fast 202.
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

  // Run after the response. A crash mid-run leaves the search in 'running';
  // the stale-run cron re-invokes and claim_sourcing_search resumes or, past
  // MAX_ATTEMPTS, fails it loudly — it never hangs.
  after(async () => {
    try {
      await runSourcingSearch(searchId);
      await recordWorkerHeartbeat(WORKER.sourcingRun, true);
    } catch (err) {
      logger.error({ err: String(err), searchId }, "[sourcing] worker after() crashed");
      Sentry.captureException(err, { tags: { worker: WORKER.sourcingRun }, extra: { searchId } });
      await recordWorkerHeartbeat(WORKER.sourcingRun, false, String(err));
    }
  });

  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}
