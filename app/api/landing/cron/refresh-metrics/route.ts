import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  // The generated types in types/supabase.ts may not include this RPC yet.
  // Cast the client to escape hatch to a loose any-RPC shape.
  const client = supabase as unknown as {
    rpc: (
      name: string,
      args?: Record<string, unknown>,
    ) => Promise<{ error: { message: string } | null }>;
  };
  const { error } = await client.rpc("refresh_landing_metrics", {});
  if (error) {
    logger.warn(`[landing-metrics] refresh failed: ${error.message}`);
    return NextResponse.json({ error: "refresh_failed", detail: error.message }, { status: 500 });
  }
  revalidateTag("landing-metrics", { expire: 60 });
  return NextResponse.json({ ok: true, refreshed_at: new Date().toISOString() });
}
