import { createClient as createSupabaseClient } from "@supabase/supabase-js";

if (typeof window !== "undefined") {
  throw new Error(
    "supabaseAdmin must not be used in client components. " +
      "Import from lib/supabase/client instead.",
  );
}

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
