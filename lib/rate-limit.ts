import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number;
}

export async function rateLimit(opts: {
  key: string;
  limit: number;
  windowSeconds: number;
}): Promise<RateLimitResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("consume_rate_limit", {
    p_key: opts.key,
    p_limit: opts.limit,
    p_window_seconds: opts.windowSeconds,
  });

  if (error) {
    logger.error({ context: "rate-limit", err: error, key: opts.key }, "Rate limit RPC failed");
    // Fail open — allow request if rate limiter is down
    return { allowed: true, remaining: opts.limit };
  }

  const row = data[0];
  return {
    allowed: row.allowed,
    remaining: row.remaining,
    retryAfter: row.retry_after > 0 ? row.retry_after : undefined,
  };
}
