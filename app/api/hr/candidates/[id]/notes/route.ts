import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { unwrapEmbed } from "@/lib/supabase/embed";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const runtime = "nodejs";

const notesSchema = z.object({
  hr_notes: z.string().max(5000),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params;

  try {
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const parsed = notesSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "validation_failed" }, { status: 400 });
    }

    const admin = createAdminClient();

    const { data: candidate } = await admin
      .from("candidates")
      .select("id, job_postings!inner(company_id)")
      .eq("id", candidateId)
      .maybeSingle();

    const job = candidate
      ? unwrapEmbed<{ company_id: string }>(candidate.job_postings)
      : null;
    if (!candidate || !job || job.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { error: updateError } = await admin
      .from("candidates")
      .update({ hr_notes: parsed.data.hr_notes })
      .eq("id", candidateId);

    if (updateError) {
      logger.error({ context: "notes", err: updateError, candidateId }, "Failed to update notes");
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    logger.error({ context: "notes", err, candidateId }, "Unhandled error in notes endpoint");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
