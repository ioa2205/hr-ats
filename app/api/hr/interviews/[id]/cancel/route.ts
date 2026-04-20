import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const admin = createAdminClient();
    const { data: req_ } = await admin
      .from("interview_requests")
      .select("id, company_id, status")
      .eq("id", id)
      .maybeSingle();
    if (!req_ || req_.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (req_.status === "cancelled") {
      return NextResponse.json({ ok: true });
    }

    const { error: updErr } = await admin
      .from("interview_requests")
      .update({ status: "cancelled" })
      .eq("id", id);
    if (updErr) {
      logger.error({ context: "interview-cancel", err: updErr, id }, "Cancel failed");
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    await admin.from("audit_log").insert({
      actor_user_id: access.user.id,
      company_id: access.companyId,
      actor: "hr",
      action: "interview.cancelled",
      entity_type: "interview_request",
      entity_id: id,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ context: "interview-cancel", err, id }, "Unhandled error");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
