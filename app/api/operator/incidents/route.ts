import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  status: z.enum(["firing", "acknowledged", "resolved", "all"]).default("firing"),
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export async function GET(request: NextRequest) {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const parsed = schema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "validation_failed" }, { status: 400 });

  const admin = createAdminClient();
  let q = admin
    .from("operator_incidents")
    .select(
      "id, rule_id, severity, target_type, target_id, target_label, summary, details, status, ack_by_user_id, ack_at, resolved_by_user_id, resolved_at, resolution_note, first_fired_at, last_fired_at",
    )
    .order("first_fired_at", { ascending: false })
    .limit(parsed.data.limit);

  if (parsed.data.status !== "all") q = q.eq("status", parsed.data.status);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "fetch_failed" }, { status: 500 });

  // Count firing for pulse pill
  const { count: firingCount } = await admin
    .from("operator_incidents")
    .select("*", { count: "exact", head: true })
    .eq("status", "firing");

  return NextResponse.json({
    data: data ?? [],
    firing: firingCount ?? 0,
  });
}
