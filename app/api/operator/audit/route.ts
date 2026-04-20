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
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "100", 10)));
    const offset = (page - 1) * limit;

    const admin = createAdminClient();
    const { data, error, count } = await admin
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error({ err: error }, "[api/operator/audit] fetch failed");
      return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
  } catch (err) {
    logger.error({ err }, "[api/operator/audit] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
