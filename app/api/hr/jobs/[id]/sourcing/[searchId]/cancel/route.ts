import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { refundSourcingQuota, SOURCING_UNITS_PER_SEARCH } from "@/lib/companies/quota";
import { logger } from "@/lib/logger";
import type { Database } from "@/types/supabase";

export const runtime = "nodejs";

// 'canceled' is a post-Docker enum value absent from the generated types.
const CANCELED_STATUS = "canceled" as unknown as Database["public"]["Enums"]["sourcing_status"];

// POST /api/hr/jobs/[id]/sourcing/[searchId]/cancel — stop a queued/running
// search. Flips it to 'canceled' (frees the per-posting in-flight slot so a new
// search can start) and refunds the consumed unit. The worker discards results
// if it was mid-run. Any in-flight Gemini calls finish silently but never persist.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; searchId: string }> },
) {
  const { id: jobPostingId, searchId } = await params;
  const access = await requireCompanyAccessApi({ requireWrite: true });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();

  // Atomically flip to canceled ONLY while still in-flight, scoped to the
  // caller's company + job. A no-op (already terminal) returns 0 rows.
  const { data: canceled, error } = await admin
    .from("sourcing_searches")
    .update({ status: CANCELED_STATUS, completed_at: new Date().toISOString() })
    .eq("id", searchId)
    .eq("company_id", access.companyId)
    .eq("job_posting_id", jobPostingId)
    .in("status", ["queued", "running"])
    .select("id")
    .maybeSingle();

  if (error) {
    logger.error({ err: error, searchId }, "[sourcing] cancel failed");
    return NextResponse.json({ error: "cancel_failed" }, { status: 500 });
  }

  if (!canceled) {
    // Already finished/canceled, or not the caller's search.
    return NextResponse.json({ error: "not_cancelable" }, { status: 409 });
  }

  // Refund the unit consumed at enqueue — a stopped run shouldn't burn a slot.
  await refundSourcingQuota(access.companyId, SOURCING_UNITS_PER_SEARCH);

  await admin.from("audit_log").insert({
    actor_user_id: access.user.id,
    company_id: access.companyId,
    actor: "hr",
    action: "sourcing.search.canceled",
    entity_type: "sourcing_search",
    entity_id: searchId,
    metadata: { job_posting_id: jobPostingId },
  });

  revalidatePath(`/hr/jobs/${jobPostingId}/sourcing/${searchId}`);
  revalidatePath(`/hr/jobs/${jobPostingId}/sourcing`);
  return NextResponse.json({ ok: true });
}
