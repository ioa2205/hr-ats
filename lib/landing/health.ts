import "server-only";
import { unstable_cache } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";

export type HealthStatus = "ok" | "degraded" | "down";

export interface HealthSnapshot {
  status: HealthStatus;
  checked_at: string;
}

async function fetchHealth(): Promise<HealthSnapshot> {
  try {
    const supabase = createPublicClient();
    const { error } = await supabase
      .from("companies")
      .select("id", { head: true, count: "exact" })
      .limit(0);
    return {
      status: error ? "degraded" : "ok",
      checked_at: new Date().toISOString(),
    };
  } catch {
    return { status: "down", checked_at: new Date().toISOString() };
  }
}

export const getHealthSnapshot = unstable_cache(fetchHealth, ["landing-health"], {
  revalidate: 60,
  tags: ["landing-health"],
});
