import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const schema = z.object({
  reason: z.string().trim().min(10).max(1000),
  /** When true, includes raw CV byte paths (not the bytes themselves); each
   *  reveal still requires a separate cv-reveal audit entry. */
  includeCvPaths: z.boolean().default(false),
});

/**
 * Generates a JSON export of a tenant's metadata. Candidate PII is limited
 * to what already flows through the HR portal — full_name, phone, status.
 * Raw CV bytes are never in the export. The response is a JSON file (not a
 * ZIP) for PR simplicity; wrap in a zip when the data volume grows.
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
  const admin = createAdminClient();

  try {
    const [companyRes, membersRes, jobsRes, candidatesRes, auditRes, cvPathsRes] = await Promise.all([
      admin.from("companies").select("*").eq("id", companyId).maybeSingle(),
      admin
        .from("company_members")
        .select("user_id, role, created_at")
        .eq("company_id", companyId),
      admin.from("job_postings").select("*").eq("company_id", companyId),
      admin
        .from("candidates")
        .select("id, job_posting_id, status, full_name, phone, created_at, updated_at, match_score")
        .in(
          "job_posting_id",
          (
            await admin.from("job_postings").select("id").eq("company_id", companyId)
          ).data?.map((r) => r.id) ?? [],
        ),
      admin
        .from("audit_log")
        .select("id, actor, action, entity_type, entity_id, metadata, created_at")
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(5000),
      parsed.data.includeCvPaths
        ? admin.storage.from("cvs").list(companyId, { limit: 1000 })
        : Promise.resolve({ data: null }),
    ]);

    if (!companyRes.data) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const payload = {
      generated_at: new Date().toISOString(),
      generated_by: auth.user.email,
      company: companyRes.data,
      members: membersRes.data ?? [],
      jobs: jobsRes.data ?? [],
      candidates: candidatesRes.data ?? [],
      audit_log: auditRes.data ?? [],
      cv_paths: parsed.data.includeCvPaths ? cvPathsRes.data : null,
    };

    await admin.from("audit_log").insert({
      actor_user_id: auth.user.id,
      actor: auth.user.email ?? "operator",
      company_id: companyId,
      action: "operator.tenant_export",
      entity_type: "company",
      entity_id: companyId,
      metadata: {
        reason: parsed.data.reason,
        include_cv_paths: parsed.data.includeCvPaths,
        member_count: membersRes.data?.length ?? 0,
        job_count: jobsRes.data?.length ?? 0,
        candidate_count: candidatesRes.data?.length ?? 0,
      },
    });

    const filename = `tezhr-tenant-${companyId}-${new Date().toISOString().slice(0, 10)}.json`;
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    logger.error({ err }, "[api/operator/companies/export-data] failed");
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}
