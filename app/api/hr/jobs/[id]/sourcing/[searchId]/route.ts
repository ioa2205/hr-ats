import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { refundSourcingQuota, SOURCING_UNITS_PER_SEARCH } from "@/lib/companies/quota";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// DELETE /api/hr/jobs/[id]/sourcing/[searchId] — remove a sourcing search and
// its sourced candidates (FK cascade). If the search was still in-flight,
// refund the consumed unit (deleting it also frees the per-posting slot).
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; searchId: string }> },
) {
  const { id: jobPostingId, searchId } = await params;
  const access = await requireCompanyAccessApi({ requireWrite: true });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();

  // Confirm ownership + capture status before deleting (to decide on a refund).
  const { data: search } = await admin
    .from("sourcing_searches")
    .select("id, status")
    .eq("id", searchId)
    .eq("company_id", access.companyId)
    .eq("job_posting_id", jobPostingId)
    .maybeSingle();

  if (!search) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const wasInFlight = search.status === "queued" || search.status === "running";

  const { error } = await admin
    .from("sourcing_searches")
    .delete()
    .eq("id", searchId)
    .eq("company_id", access.companyId);

  if (error) {
    logger.error({ err: error, searchId }, "[sourcing] delete failed");
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }

  // A still-running search hadn't been refunded yet — give the unit back.
  if (wasInFlight) {
    await refundSourcingQuota(access.companyId, SOURCING_UNITS_PER_SEARCH);
  }

  await admin.from("audit_log").insert({
    actor_user_id: access.user.id,
    company_id: access.companyId,
    actor: "hr",
    action: "sourcing.search.deleted",
    entity_type: "sourcing_search",
    entity_id: searchId,
    metadata: { job_posting_id: jobPostingId, prior_status: search.status },
  });

  revalidatePath(`/hr/jobs/${jobPostingId}/sourcing`);
  return NextResponse.json({ ok: true });
}
