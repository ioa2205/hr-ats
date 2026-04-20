import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import { PatchInterviewRequestSchema } from "@/lib/interviews/validators";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json().catch(() => null);
    const parsed = PatchInterviewRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "validation_failed" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: req_ } = await admin
      .from("interview_requests")
      .select("id, company_id, status, expires_at")
      .eq("id", id)
      .maybeSingle();
    if (!req_ || req_.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const updates: Record<string, string | null> = {};
    if (parsed.data.hr_message !== undefined) {
      updates.hr_message = parsed.data.hr_message ?? null;
    }
    if (parsed.data.extend_days) {
      const base = new Date(req_.expires_at);
      const next = new Date(base.getTime() + parsed.data.extend_days * 24 * 60 * 60 * 1000);
      updates.expires_at = next.toISOString();
    }
    if (parsed.data.reopen && req_.status === "expired") {
      updates.status = "pending";
      if (!parsed.data.extend_days) {
        const next = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        updates.expires_at = next.toISOString();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true });
    }

    const { error: updErr } = await admin
      .from("interview_requests")
      .update(updates)
      .eq("id", id);
    if (updErr) {
      logger.error({ context: "interview-patch", err: updErr, id }, "Update failed");
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ context: "interview-patch", err, id }, "Unhandled error");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
