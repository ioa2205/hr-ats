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
    const search = searchParams.get("search")?.trim() ?? "";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    const admin = createAdminClient();

    let query = admin
      .from("profiles")
      .select(
        "id, email, full_name, avatar_url, phone, locale, is_operator, created_at, current_company_id, company:companies!profiles_current_company_id_fkey(id, name)",
        {
          count: "exact",
        },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      // PostgREST parses `or()` as a comma-separated expression, so characters
      // like , ( ) " * \ in unescaped user input can break out of the ilike
      // value and inject arbitrary filters. Strip them and cap length.
      const safeSearch = search.replace(/[,()"*\\]/g, "").slice(0, 64);
      if (safeSearch.length > 0) {
        query = query.or(`email.ilike.%${safeSearch}%,full_name.ilike.%${safeSearch}%`);
      }
    }

    const { data, error, count } = await query;

    if (error) {
      logger.error({ err: error }, "[api/operator/users] fetch failed");
      return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [], total: count ?? 0, page, limit });
  } catch (err) {
    logger.error({ err }, "[api/operator/users] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
