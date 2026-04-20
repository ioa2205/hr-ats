import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireOperatorApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const admin = createAdminClient();
    let query = admin
      .from("ai_processing_attempts")
      .select(
        "id, created_at, status, prompt_tokens, output_tokens, cost_usd, duration_ms, error, candidate:candidates(full_name, job_posting:job_postings(title, company:companies(name)))",
      )
      .order("created_at", { ascending: false })
      .limit(50);

    if (status && ["success", "failed", "rate_limited", "timeout"].includes(status)) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      logger.error({ err: error }, "[api/operator/processing] fetch failed");
      return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error({ err }, "[api/operator/processing] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
