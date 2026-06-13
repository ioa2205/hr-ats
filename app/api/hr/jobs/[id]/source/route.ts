import { NextResponse, after, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import {
  canSource,
  consumeSourcingQuota,
  refundSourcingQuota,
  SOURCING_UNITS_PER_SEARCH,
} from "@/lib/companies/quota";
import { kickSourcingWorker } from "@/lib/sourcing/kick";
import { availableSourcesForCompany } from "@/lib/sourcing/availability";
import type { SearchOverrides, SourceKind } from "@/lib/sourcing/types";
import type { Database, Json } from "@/types/supabase";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Sources a user may toggle from the config dialog. `linkedin_url` is a schema
// placeholder, never user-selectable.
const SELECTABLE_SOURCES = ["internal_pool", "hh", "telegram"] as const;

// Optional config from the "Find candidates" / "Adjust & re-run" dialog. A bare
// POST with no body (the original one-click flow) parses to {} ⇒ all-defaults.
const bodySchema = z
  .object({
    sources: z.array(z.enum(SELECTABLE_SOURCES)).min(1).optional(),
    keywords: z.array(z.string().trim().min(1)).max(20).optional(),
    // hh.uz area id (digits per hh `/areas`); null ⇒ all areas; absent ⇒ default.
    areaId: z.string().trim().max(20).nullable().optional(),
    // matching strictness; absent ⇒ the balanced default applied below.
    strictness: z.enum(["strict", "balanced", "broad"]).optional(),
  })
  .strict();

type SourcingSearchInsert = Database["public"]["Tables"]["sourcing_searches"]["Insert"] & {
  // search_overrides + strictness are post-Docker columns absent from the
  // generated types.
  search_overrides?: Json | null;
  strictness?: string;
};

// POST /api/hr/jobs/[id]/source — "Find candidates". Recruiter+ (any member
// with write access). Consumes a sourcing unit atomically, enqueues a queued
// search (the partial unique index blocks a second in-flight run per posting),
// kicks the background worker after the response, and returns immediately.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: jobPostingId } = await params;
    const access = await requireCompanyAccessApi({ requireWrite: true });
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Optional dialog config. A bodyless POST (original one-click) ⇒ {} ⇒ defaults.
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    const { sources: requestedSources, keywords, areaId, strictness } = parsed.data;

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

    // Availability is the ceiling; intersect with the user's selection so a user
    // can never enable a source that isn't actually configured. Computed BEFORE
    // quota consumption so a bad selection never burns a unit.
    const available = await availableSourcesForCompany(access.companyId);

    const sources: SourceKind[] = requestedSources
      ? available.filter((kind) => requestedSources.includes(kind as (typeof SELECTABLE_SOURCES)[number]))
      : available;
    if (sources.length === 0) {
      return NextResponse.json({ error: "no_sources_selected" }, { status: 400 });
    }

    // hh.uz-only knobs. Persisted only when the user actually set one — a null
    // row keeps today's zero-config behavior.
    const overrides: SearchOverrides | null =
      keywords?.length || areaId !== undefined
        ? {
            ...(keywords?.length ? { keywords } : {}),
            ...(areaId !== undefined ? { area_id: areaId } : {}),
          }
        : null;

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

    // Enqueue. The partial unique index (job_posting_id where status in
    // queued/running) rejects a second in-flight run with code 23505.
    const insertRow: SourcingSearchInsert = {
      company_id: access.companyId,
      job_posting_id: jobPostingId,
      requested_by: access.user.id,
      status: "queued",
      sources,
      // Only reference the (post-Docker) column when there's an override, so the
      // zero-config flow keeps working even if code ships before the migration.
      ...(overrides ? { search_overrides: overrides as unknown as Json } : {}),
      ...(strictness ? { strictness } : {}),
    };
    const { data: search, error: insErr } = await admin
      .from("sourcing_searches")
      .insert(insertRow)
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
      metadata: { job_posting_id: jobPostingId, title: job.title, sources, has_overrides: overrides != null },
    });

    // Quick fire-and-forget kick to the dedicated worker route, which runs the
    // funnel inline. Runs in after() (a fast HTTP dispatch, unlike the full
    // funnel) so the 202 returns immediately; the pickup cron is the backstop.
    after(() => kickSourcingWorker(search.id));

    revalidatePath(`/hr/jobs/${jobPostingId}`);
    return NextResponse.json({ searchId: search.id }, { status: 202 });
  } catch (err) {
    logger.error({ err: String(err) }, "[sourcing] trigger unexpected error");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
