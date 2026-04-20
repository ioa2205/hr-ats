import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Anon Supabase client without cookie bridging. Safe to use inside
 * `unstable_cache()` — RLS still applies (anon role), but nothing reads
 * from request cookies, so the cached scope has no dynamic inputs.
 * Use only for public-read queries (landing_metrics, landing_customers
 * with live_at, landing_case_studies with published_at).
 */
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
