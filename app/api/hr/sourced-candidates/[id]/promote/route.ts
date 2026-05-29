import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import type { HardRequirement } from "@/types";
import type { Json } from "@/types/supabase";
import type { NormalizedProfile, RequirementResult, SourcedContact } from "@/lib/sourcing/types";

const UZ_PHONE = /^\+998\d{9}$/;

// POST /api/hr/sourced-candidates/[id]/promote
// Materializes a sourced candidate into a real candidates row (status
// 'unscored') with requirements_snapshot populated, ready for the existing
// pipeline. Idempotent: re-promoting a linked row is a no-op.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: sourcedId } = await params;
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const admin = createAdminClient();

    const { data: sourced } = await admin
      .from("sourced_candidates")
      .select("*")
      .eq("id", sourcedId)
      .eq("company_id", access.companyId)
      .maybeSingle();

    if (!sourced) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (sourced.promoted_candidate_id) {
      return NextResponse.json({ candidateId: sourced.promoted_candidate_id, alreadyPromoted: true });
    }

    const profile = (sourced.profile ?? {}) as NormalizedProfile;
    const contact = (sourced.contact ?? {}) as SourcedContact;
    const phone = (contact.phone ?? "").replace(/\s+/g, "");
    if (!UZ_PHONE.test(phone)) {
      // The candidates table enforces a +998 phone; sourced profiles that lack
      // one cannot be promoted automatically (a future flow can collect it).
      return NextResponse.json({ error: "no_phone" }, { status: 400 });
    }

    // Resolve the target posting's current hard requirements for the snapshot.
    const { data: search } = await admin
      .from("sourcing_searches")
      .select("job_posting_id")
      .eq("id", sourced.sourcing_search_id)
      .maybeSingle();
    if (!search) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const { data: job } = await admin
      .from("job_postings")
      .select("hard_requirements")
      .eq("id", search.job_posting_id)
      .maybeSingle();
    const snapshot = (job?.hard_requirements ?? []) as HardRequirement[];

    const reqResults = (sourced.requirement_results ?? []) as RequirementResult[];
    const responses: Record<string, string> = {};
    for (const result of reqResults) {
      if (result.evidence) responses[result.requirement_id] = result.evidence;
    }

    const candidateId = crypto.randomUUID();
    const { error: insErr } = await admin.from("candidates").insert({
      id: candidateId,
      job_posting_id: search.job_posting_id,
      full_name: profile.full_name ?? "—",
      phone_number: phone,
      status: "unscored",
      requirements_snapshot: snapshot as unknown as Json,
      requirements_responses: (Object.keys(responses).length > 0 ? responses : null) as unknown as Json,
      meets_requirements: sourced.meets_all_requirements,
    });

    if (insErr) {
      logger.error({ err: insErr, sourcedId }, "[sourcing] promote insert failed");
      return NextResponse.json({ error: "promote_failed" }, { status: 500 });
    }

    await admin
      .from("sourced_candidates")
      .update({ promoted_candidate_id: candidateId })
      .eq("id", sourcedId);

    await admin.from("audit_log").insert({
      actor_user_id: access.user.id,
      company_id: access.companyId,
      actor: "hr",
      action: "sourcing.candidate.promoted",
      entity_type: "candidate",
      entity_id: candidateId,
      metadata: { sourced_candidate_id: sourcedId, job_posting_id: search.job_posting_id },
    });

    revalidatePath(`/hr/jobs/${search.job_posting_id}/applicants`);
    return NextResponse.json({ candidateId }, { status: 201 });
  } catch (err) {
    logger.error({ err: String(err) }, "[sourcing] promote unexpected error");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
