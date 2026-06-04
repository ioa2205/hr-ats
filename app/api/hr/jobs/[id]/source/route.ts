import { NextResponse, after, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import {
  canSource,
  consumeSourcingQuota,
  refundSourcingQuota,
  SOURCING_UNITS_PER_SEARCH,
} from "@/lib/companies/quota";
import { runSourcingSearch } from "@/lib/sourcing/run";
import { hhConfiguredFromEnv } from "@/lib/sourcing/connectors/hh";
import {
  telegramBotIntakeConfigured,
  telegramConfiguredFromEnv,
} from "@/lib/sourcing/connectors/telegram";
import type { SourceKind } from "@/lib/sourcing/types";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// POST /api/hr/jobs/[id]/source — "Find candidates". Recruiter+ (any member
// with write access). Consumes a sourcing unit atomically, enqueues a queued
// search (the partial unique index blocks a second in-flight run per posting),
// kicks the background worker after the response, and returns immediately.
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: jobPostingId } = await params;
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const admin = createAdminClient();

    // The posting must exist and belong to the caller's company.
    const { data: job } = await admin
      .from("job_postings")
      .select("id, company_id, title")
      .eq("id", jobPostingId)
      .single();
    if (!job || job.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    // Advisory pre-check for a friendly message (authoritative gate is below).
    const advisory = await canSource(access.companyId);
    if (!advisory.allowed) {
      const status = advisory.reason === "sourcing_quota_exceeded" ? 402 : 403;
      return NextResponse.json({ error: advisory.reason }, { status });
    }

    // Atomic consume (FOR UPDATE row lock) — the real gate under concurrency.
    const quota = await consumeSourcingQuota(access.companyId, SOURCING_UNITS_PER_SEARCH);
    if (!quota.ok) {
      const status = quota.reason === "sourcing_quota_exceeded" ? 402 : 403;
      return NextResponse.json({ error: quota.reason }, { status });
    }

    // Record the sources that will actually run (the worker builds connectors
    // from the same env signal). hh joins only when its credentials are set.
    const sources: SourceKind[] = ["internal_pool"];
    if (hhConfiguredFromEnv()) sources.push("hh");
    // telegram covers BOTH the MTProto (public) and bot-intake (owned) paths.
    if (telegramConfiguredFromEnv() || telegramBotIntakeConfigured()) sources.push("telegram");

    // Enqueue. The partial unique index (job_posting_id where status in
    // queued/running) rejects a second in-flight run with code 23505.
    const { data: search, error: insErr } = await admin
      .from("sourcing_searches")
      .insert({
        company_id: access.companyId,
        job_posting_id: jobPostingId,
        requested_by: access.user.id,
        status: "queued",
        sources,
      })
      .select("id")
      .single();

    if (insErr || !search) {
      // Refund — no new search was created, so the unit must not be burned.
      await refundSourcingQuota(access.companyId, SOURCING_UNITS_PER_SEARCH);
      if ((insErr as { code?: string } | null)?.code === "23505") {
        return NextResponse.json({ error: "already_searching" }, { status: 409 });
      }
      logger.error({ err: insErr, jobPostingId }, "[sourcing] enqueue failed");
      return NextResponse.json({ error: "enqueue_failed" }, { status: 500 });
    }

    await admin.from("audit_log").insert({
      actor_user_id: access.user.id,
      company_id: access.companyId,
      actor: "hr",
      action: "sourcing.search.created",
      entity_type: "sourcing_search",
      entity_id: search.id,
      metadata: { job_posting_id: jobPostingId, title: job.title },
    });

    // Immediate background kick (the pickup cron is the backstop).
    after(async () => {
      try {
        await runSourcingSearch(search.id);
      } catch (err) {
        logger.error({ err: String(err), searchId: search.id }, "[sourcing] kick crashed");
      }
    });

    revalidatePath(`/hr/jobs/${jobPostingId}`);
    return NextResponse.json({ searchId: search.id }, { status: 202 });
  } catch (err) {
    logger.error({ err: String(err) }, "[sourcing] trigger unexpected error");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
