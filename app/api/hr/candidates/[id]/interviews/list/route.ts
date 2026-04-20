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

    const { data: candidate } = await admin
      .from("candidates")
      .select("id, job_postings!inner(company_id)")
      .eq("id", candidateId)
      .maybeSingle();
    if (!candidate) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const job = unwrapEmbed<{ company_id: string }>(candidate.job_postings);
    if (!job || job.company_id !== access.companyId) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const { data: requests } = await admin
      .from("interview_requests")
      .select(
        "id, public_token, status, duration_minutes, location_kind, location_detail, expires_at, booked_at, booked_slot_id, candidate_note",
      )
      .eq("candidate_id", candidateId)
      .order("created_at", { ascending: false });

    const items = requests ?? [];

    const bookedSlotIds = items
      .map((r) => r.booked_slot_id)
      .filter((v): v is string => Boolean(v));
    let bookedMap: Record<string, string> = {};
    if (bookedSlotIds.length > 0) {
      const { data: slots } = await admin
        .from("interview_slots")
        .select("id, start_at")
        .in("id", bookedSlotIds);
      bookedMap = Object.fromEntries((slots ?? []).map((s) => [s.id, s.start_at]));
    }

    return NextResponse.json({
      ok: true,
      items: items.map((r) => ({
        id: r.id,
        public_token: r.public_token,
        status: r.status,
        duration_minutes: r.duration_minutes,
        location_kind: r.location_kind,
        location_detail: r.location_detail,
        expires_at: r.expires_at,
        booked_at: r.booked_at,
        booked_start_at: r.booked_slot_id ? bookedMap[r.booked_slot_id] ?? null : null,
        candidate_note: r.candidate_note,
      })),
    });
  } catch (err) {
    logger.error(
      { context: "interview-list", err, candidateId },
      "Unhandled error",
    );
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
