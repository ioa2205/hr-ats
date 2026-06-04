import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  confirmName: z.string().trim().min(1).max(200),
  reason: z.string().trim().min(10).max(1000),
  /** When true, schedules a 30-day grace delete instead of immediate soft-delete. */
  grace: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOperatorApi({ write: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }
  const { id: companyId } = await params;
  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id, name, status")
    .eq("id", companyId)
    .maybeSingle();

  if (!company) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (company.name !== parsed.data.confirmName) {
    return NextResponse.json({ error: "name_mismatch" }, { status: 400 });
  }

  let update: Record<string, unknown>;
  if (parsed.data.grace) {
    const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    update = { deletion_scheduled_at: scheduledAt };
  } else {
    update = { status: "deleted", deletion_scheduled_at: null };
  }

  const { error } = await admin.from("companies").update(update).eq("id", companyId);
  if (error) {
    logger.error({ err: error }, "[api/operator/companies/delete] failed");
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    company_id: companyId,
    action: parsed.data.grace ? "operator.delete_scheduled" : "operator.delete_immediate",
    entity_type: "company",
    entity_id: companyId,
    metadata: {
      reason: parsed.data.reason,
      scheduled_at: update.deletion_scheduled_at ?? null,
      confirm_name: parsed.data.confirmName,
    },
  });

  return NextResponse.json({ ok: true, ...update });
}
