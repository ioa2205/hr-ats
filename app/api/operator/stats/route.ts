import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const auth = await requireOperatorApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = createAdminClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [companiesResult, usersResult, mauResult, costData30d, costDataAll, storageData] =
      await Promise.all([
        admin
          .from("companies")
          .select("*", { count: "exact", head: true })
          .neq("status", "deleted"),

        admin.from("profiles").select("*", { count: "exact", head: true }),

        admin
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("updated_at", thirtyDaysAgo),

        admin.from("ai_processing_attempts").select("cost_usd").gte("created_at", thirtyDaysAgo),

        admin.from("ai_processing_attempts").select("cost_usd"),

        admin.rpc("get_storage_usage").maybeSingle(),
      ]);

    const aiCost30d =
      costData30d.data?.reduce(
        (sum: number, row: { cost_usd: number | null }) => sum + (row.cost_usd ?? 0),
        0,
      ) ?? 0;

    const aiCostLifetime =
      costDataAll.data?.reduce(
        (sum: number, row: { cost_usd: number | null }) => sum + (row.cost_usd ?? 0),
        0,
      ) ?? 0;

    const storageResult = storageData.data as { total_bytes: number; file_count: number } | null;

    return NextResponse.json({
      totalCompanies: companiesResult.count ?? 0,
      totalUsers: usersResult.count ?? 0,
      mau: mauResult.count ?? 0,
      aiCost30d: Math.round(aiCost30d * 100) / 100,
      aiCostLifetime: Math.round(aiCostLifetime * 100) / 100,
      storageUsedMb: Math.round(((storageResult?.total_bytes ?? 0) / (1024 * 1024)) * 100) / 100,
      storageFileCount: storageResult?.file_count ?? 0,
    });
  } catch (err) {
    logger.error({ err }, "[api/operator/stats] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
