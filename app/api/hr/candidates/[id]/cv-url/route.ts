import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { unwrapEmbed } from "@/lib/supabase/embed";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: candidateId } = await params;

  try {
    const access = await requireCompanyAccessApi();
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const admin = createAdminClient();
    const { data: candidate, error: fetchError } = await admin
      .from("candidates")
      .select("cv_storage_path, job_posting_id, job_postings!inner(company_id)")
      .eq("id", candidateId)
      .maybeSingle();

    if (fetchError || !candidate) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const job = unwrapEmbed<{ company_id: string }>(candidate.job_postings);
    if (!job || job.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (!candidate.cv_storage_path) {
      return NextResponse.json({ error: "no_cv" }, { status: 404 });
    }

    const { data: signedUrlData, error: signError } = await admin.storage
      .from("cvs")
      .createSignedUrl(candidate.cv_storage_path, 600); // 10 min

    if (signError || !signedUrlData) {
      logger.error(
        { context: "cv-url", err: signError, candidateId },
        "Failed to create signed URL",
      );
      return NextResponse.json({ error: "sign_failed" }, { status: 500 });
    }

    return NextResponse.json({ url: signedUrlData.signedUrl });
  } catch (err) {
    logger.error({ context: "cv-url", err, candidateId }, "Unhandled error in cv-url endpoint");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
