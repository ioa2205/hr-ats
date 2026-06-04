import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const PatchBody = z.object({ active: z.boolean() });

// PATCH — enable/disable a registered channel (pause ingest without losing the
// claim). Write access; scoped to the caller's company.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCompanyAccessApi({ requireWrite: true });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  let active: boolean;
  try {
    active = PatchBody.parse(await request.json()).active;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("telegram_intake_channels")
    .update({ active })
    .eq("id", id)
    .eq("company_id", access.companyId)
    .select("id")
    .maybeSingle();

  if (error) {
    logger.error({ err: error, id }, "[sourcing] patch tg channel failed");
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

// DELETE — drop a channel registration. Write access; scoped to the company.
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireCompanyAccessApi({ requireWrite: true });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("telegram_intake_channels")
    .delete()
    .eq("id", id)
    .eq("company_id", access.companyId)
    .select("id")
    .maybeSingle();

  if (error) {
    logger.error({ err: error, id }, "[sourcing] delete tg channel failed");
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await admin.from("audit_log").insert({
    actor_user_id: access.user.id,
    company_id: access.companyId,
    actor: "hr",
    action: "sourcing.telegram_channel.removed",
    entity_type: "telegram_intake_channel",
    entity_id: id,
    metadata: {},
  });

  return NextResponse.json({ ok: true });
}
