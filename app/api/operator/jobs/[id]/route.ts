import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireOperatorApi({ write: true });
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const admin = createAdminClient();

    const { data: job, error: jobError } = await admin
      .from("job_postings")
      .select("id, title, company_id")
      .eq("id", id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const { data: candidates } = await admin
      .from("candidates")
      .select("id, cv_storage_path")
      .eq("job_posting_id", id);

    const storagePaths = (candidates ?? [])
      .map((c) => c.cv_storage_path)
      .filter(Boolean) as string[];
    const candidateCount = candidates?.length ?? 0;

    const { error: deleteError } = await admin.from("job_postings").delete().eq("id", id);

    if (deleteError) {
      logger.error({ err: deleteError, jobId: id }, "[api/operator/jobs] delete failed");
      return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }

    if (storagePaths.length > 0) {
      admin.storage
        .from("cvs")
        .remove(storagePaths)
        .then(({ error }) => {
          if (error) {
            logger.warn(
              { err: error, paths: storagePaths.length },
              "[api/operator/jobs] storage cleanup partial failure",
            );
          }
        })
        .catch((err) => {
          logger.warn(
            { err, paths: storagePaths.length },
            "[api/operator/jobs] storage cleanup failed",
          );
        });
    }

    await admin.from("audit_log").insert({
      actor_user_id: auth.user.id,
      company_id: job.company_id,
      actor: auth.user.email ?? "operator",
      action: "job_posting.deleted",
      entity_type: "job_posting",
      entity_id: id,
      metadata: {
        title: job.title,
        candidatesDeleted: candidateCount,
        filesQueued: storagePaths.length,
        operator_id: auth.user.id,
      },
    });

    logger.info(
      { jobId: id, candidates: candidateCount, files: storagePaths.length },
      "[api/operator/jobs] job posting deleted",
    );

    return NextResponse.json({
      deleted: { jobPosting: 1, candidates: candidateCount, files: storagePaths.length },
    });
  } catch (err) {
    logger.error({ err }, "[api/operator/jobs] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
