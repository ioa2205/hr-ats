import { NextResponse, type NextRequest } from "next/server";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import {
  AUDIT_LIMIT,
  COMPANY_LIMIT,
  USER_LIMIT,
  isUuid,
  sanitizeIlike,
  searchQuerySchema,
  type SearchResponse,
} from "@/lib/operator/search-schema";

export async function GET(request: NextRequest) {
  const auth = await requireOperatorApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = searchQuerySchema.safeParse({
    q: request.nextUrl.searchParams.get("q") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }

  const { q } = parsed.data;
  const like = `%${sanitizeIlike(q)}%`;
  const admin = createAdminClient();

  try {
    const [companiesRes, usersRes, auditRes] = await Promise.all([
      isUuid(q)
        ? admin
            .from("companies")
            .select("id, name, slug, status")
            .eq("id", q)
            .limit(COMPANY_LIMIT)
        : admin
            .from("companies")
            .select("id, name, slug, status")
            .or(`name.ilike.${like},slug.ilike.${like}`)
            .order("created_at", { ascending: false })
            .limit(COMPANY_LIMIT),
      admin
        .from("profiles")
        .select("id, email, full_name, is_operator")
        .or(`email.ilike.${like},full_name.ilike.${like}`)
        .order("created_at", { ascending: false })
        .limit(USER_LIMIT),
      admin
        .from("audit_log")
        .select("id, action, actor, created_at")
        .ilike("action", like)
        .order("created_at", { ascending: false })
        .limit(AUDIT_LIMIT),
    ]);

    if (companiesRes.error) throw companiesRes.error;
    if (usersRes.error) throw usersRes.error;
    if (auditRes.error) throw auditRes.error;

    const body: SearchResponse = {
      companies: (companiesRes.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        status: c.status,
      })),
      users: (usersRes.data ?? []).map((u) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name,
        isOperator: u.is_operator === true,
      })),
      audit: (auditRes.data ?? []).map((a) => ({
        id: a.id,
        action: a.action,
        actor: a.actor,
        createdAt: a.created_at,
      })),
    };

    return NextResponse.json(body, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    logger.error({ err }, "[api/operator/search] query failed");
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
