import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { unwrapEmbed } from "@/lib/supabase/embed";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params;

  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const admin = createAdminClient();
    const { data: candidate, error: fetchError } = await admin
      .from("candidates")
      .select("id, status, job_postings!inner(company_id)")
      .eq("id", candidateId)
      .maybeSingle();

    if (fetchError || !candidate) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const job = unwrapEmbed<{ company_id: string }>(candidate.job_postings);
    if (!job || job.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (candidate.status === "invited") {
      return NextResponse.json({ error: "already_invited" }, { status: 400 });
    }

    const { error: updateError } = await admin
      .from("candidates")
      .update({
        status: "invited",
        invited_at: new Date().toISOString(),
      })
      .eq("id", candidateId);

    if (updateError) {
      logger.error(
        { context: "invite", err: updateError, candidateId },
        "Failed to mark candidate as invited",
      );
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    await admin.from("audit_log").insert({
      actor_user_id: access.user.id,
      company_id: access.companyId,
      actor: "hr",
      action: "candidate.invited",
      entity_type: "candidate",
      entity_id: candidateId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ context: "invite", err, candidateId }, "Unhandled error in invite endpoint");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
