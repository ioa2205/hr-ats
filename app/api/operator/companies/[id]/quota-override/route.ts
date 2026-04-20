import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  cvQuotaLimit: z.number().int().min(0).max(100_000).optional(),
  jobQuotaLimit: z.number().int().min(0).max(10_000).optional(),
  reason: z.string().trim().min(10).max(1000),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }
  if (parsed.data.cvQuotaLimit === undefined && parsed.data.jobQuotaLimit === undefined) {
    return NextResponse.json({ error: "no_override_fields" }, { status: 400 });
  }

  const { id: companyId } = await params;
  const admin = createAdminClient();

  const { data: before } = await admin
    .from("subscriptions")
    .select("cv_quota_limit, job_quota_limit, manual_override")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!before) return NextResponse.json({ error: "subscription_not_found" }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (parsed.data.cvQuotaLimit !== undefined) update.cv_quota_limit = parsed.data.cvQuotaLimit;
  if (parsed.data.jobQuotaLimit !== undefined) update.job_quota_limit = parsed.data.jobQuotaLimit;

  const nextOverride = {
    ...(before.manual_override as Record<string, unknown> | null),
    ...update,
    reason: parsed.data.reason,
    by: auth.user.id,
    at: new Date().toISOString(),
  };
  update.manual_override = nextOverride;

  const { error } = await admin.from("subscriptions").update(update).eq("company_id", companyId);
  if (error) {
    logger.error({ err: error }, "[api/operator/companies/quota-override] failed");
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    company_id: companyId,
    action: "operator.quota_override",
    entity_type: "subscription",
    entity_id: companyId,
    metadata: {
      before: {
        cv_quota_limit: before.cv_quota_limit,
        job_quota_limit: before.job_quota_limit,
      },
      after: update,
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json({ ok: true });
}
