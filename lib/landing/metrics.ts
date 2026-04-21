import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import { logger } from "@/lib/logger";

export interface PlatformMetrics {
  total_companies: number | null;
  total_cvs_processed_lifetime: number | null;
  cvs_processed_today: number | null;
  avg_screening_seconds: number | null;
  refreshed_at: string | null;
}

async function fetchPlatformMetrics(): Promise<PlatformMetrics | null> {
  try {
    const supabase = createPublicClient();
    // get_landing_metrics() is a SECURITY DEFINER wrapper over the
    // landing_metrics materialized view. The MV itself is no longer
    // directly selectable by anon/authenticated (see migration 280).
    const { data, error } = await supabase
      .rpc("get_landing_metrics")
      .limit(1)
      .maybeSingle();
    if (error) {
      if (!/does not exist|relation .* not found|permission/i.test(error.message)) {
        logger.warn(`[landing] metrics fetch warning: ${error.message}`);
      }
      return null;
    }
    return (data as PlatformMetrics | null) ?? null;
  } catch (err) {
    logger.warn(`[landing] metrics fetch threw: ${(err as Error).message}`);
    return null;
  }
}

export const getPlatformMetrics = unstable_cache(fetchPlatformMetrics, ["landing-metrics"], {
  revalidate: 300,
  tags: ["landing-metrics"],
});
