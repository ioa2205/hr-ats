import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const querySchema = z.object({
  section: z.enum(["profile", "notifications", "company", "team", "templates", "ai", "billing"]),
});

export async function GET(req: Request) {
  const access = await requireCompanyAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({ section: url.searchParams.get("section") });
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_section" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: row, error } = await admin
    .from("audit_log")
    .select("created_at, actor_user_id")
    .eq("company_id", access.companyId)
    .like("action", `settings.${parsed.data.section}.%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, companyId: access.companyId }, "[settings] last-saved query failed");
    return NextResponse.json({ at: null, actor: null });
  }

  if (!row) {
    return NextResponse.json({ at: null, actor: null });
  }

  let actorName: string | null = null;
  if (row.actor_user_id) {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", row.actor_user_id)
      .maybeSingle();
    actorName = profile?.full_name ?? null;
  }

  return NextResponse.json({ at: row.created_at, actor: actorName });
}
