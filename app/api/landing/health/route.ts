import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 60;

export async function GET() {
  const started = Date.now();
  let dbOk = false;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("companies").select("id", { head: true, count: "exact" }).limit(0);
    dbOk = !error;
  } catch {
    dbOk = false;
  }
  const elapsedMs = Date.now() - started;
  return NextResponse.json(
    {
      status: dbOk ? "ok" : "degraded",
      db: dbOk ? "up" : "down",
      latency_ms: elapsedMs,
      checked_at: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" } },
  );
}
