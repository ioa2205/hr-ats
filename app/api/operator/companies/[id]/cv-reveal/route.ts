import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const schema = z.object({
  path: z.string().trim().min(1).max(1000),
  reason: z.string().trim().min(10).max(1000),
});

/**
 * Generates a 5-minute signed URL for a candidate CV, audited. Operators
 * must provide a reason (min 10 chars). The path must live under the given
 * company's CV namespace.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_failed" }, { status: 400 });

  const { id: companyId } = await params;

  // Defense in depth: reject paths that don't live under this tenant's namespace.
  if (!parsed.data.path.startsWith(`${companyId}/`)) {
    return NextResponse.json({ error: "path_outside_tenant" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.storage.from("cvs").createSignedUrl(parsed.data.path, 300);

  if (error || !data?.signedUrl) {
    logger.error({ err: error }, "[api/operator/companies/cv-reveal] sign failed");
    return NextResponse.json({ error: "sign_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    company_id: companyId,
    action: "operator.cv_reveal",
    entity_type: "storage_object",
    entity_id: null,
    metadata: {
      path: parsed.data.path,
      reason: parsed.data.reason,
      ttl_seconds: 300,
    },
  });

  return NextResponse.json({
    signedUrl: data.signedUrl,
    expiresInSec: 300,
  });
}
