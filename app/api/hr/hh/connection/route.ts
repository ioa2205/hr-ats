import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { disconnectCompanyHh } from "@/lib/sourcing/connectors/hh";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET() {
  const access = await requireCompanyAccessApi();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("company_hh_connections")
    .select("company_id, employer_id, employer_name, status, last_error, last_error_at, access_expires_at, updated_at")
    .eq("company_id", access.companyId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error, companyId: access.companyId }, "[sourcing] hh connection fetch failed");
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  return NextResponse.json({ connection: data ?? null });
}

export async function DELETE() {
  const access = await requireCompanyAccessApi({
    roles: ["owner", "admin"],
  });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  await disconnectCompanyHh(access.companyId);
  const admin = createAdminClient();
  await admin.from("audit_log").insert({
    actor_user_id: access.user.id,
    company_id: access.companyId,
    actor: "hr",
    action: "sourcing.hh.disconnected",
    entity_type: "company_hh_connection",
    entity_id: access.companyId,
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}
