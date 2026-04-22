import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

const paramsSchema = z.object({
  search: z.string().trim().max(80).optional(),
  status: z.enum(["all", "active", "suspended", "deleted"]).default("all"),
  plan: z.enum(["all", "trial", "pro"]).default("all"),
  view: z
    .enum(["all", "active", "suspended", "deleted", "trials_expiring", "at_risk"])
    .default("all"),
  minHealth: z.coerce.number().min(0).max(100).optional(),
  maxHealth: z.coerce.number().min(0).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(request: NextRequest) {
  const auth = await requireOperatorApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = paramsSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "validation_failed" }, { status: 400 });
  }
  const q = parsed.data;

  const admin = createAdminClient();
  const offset = (q.page - 1) * q.limit;

  try {
    let query = admin
      .from("companies")
      .select(
        "*, subscriptions(status, trial_ends_at, pro_started_at), company_members(count)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    // Deleted companies are hidden by default — they only show up under the
    // explicit "Deleted" view or when status=deleted is passed.
    const wantsDeleted = q.view === "deleted" || q.status === "deleted";
    if (!wantsDeleted) query = query.neq("status", "deleted");

    // Saved views (precedence over status filter)
    if (q.view === "active") query = query.eq("status", "active");
    else if (q.view === "suspended") query = query.eq("status", "suspended");
    else if (q.view === "deleted") query = query.eq("status", "deleted");
    else if (q.view === "trials_expiring") {
      const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      query = query.eq("status", "active").lte("subscriptions.trial_ends_at", in7);
    } else if (q.view === "at_risk") {
      // Filtered post-hoc by health.score < 40; no-op here.
    } else if (q.status !== "all") {
      query = query.eq("status", q.status);
    }

    if (q.search) {
      const like = q.search
        .replace(/[\\%_]/g, (c) => `\\${c}`)
        .replace(/[(),]/g, " ")
        .trim();
      if (like.length > 0) {
        query = query.or(`name.ilike.%${like}%,slug.ilike.%${like}%`);
      }
    }

    query = query.range(offset, offset + q.limit - 1);

    const [listRes, healthRes] = await Promise.all([
      query,
      admin.from("company_health").select("company_id, score"),
    ]);

    if (listRes.error) {
      logger.error({ err: listRes.error }, "[api/operator/companies] fetch failed");
      return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
    }

    const healthMap = new Map<string, number>(
      (healthRes.data ?? []).map((r) => [r.company_id as string, Number(r.score)]),
    );

    type RawSub = {
      status: string;
      trial_ends_at: string | null;
      pro_started_at: string | null;
    };
    type RawRow = {
      id: string;
      name: string;
      slug: string;
      status: string;
      default_locale: string;
      created_at: string;
      // `subscriptions.company_id` is a PRIMARY KEY that FKs to companies, so
      // PostgREST surfaces it as a one-to-one embed (object, not array).
      subscriptions: RawSub | RawSub[] | null;
      company_members: { count: number }[] | null;
    };

    function toSubArray(s: RawSub | RawSub[] | null | undefined): RawSub[] {
      if (!s) return [];
      return Array.isArray(s) ? s : [s];
    }

    // `plan` isn't a column on `subscriptions` — it's derived from status +
    // pro_started_at. Normalise the embed into an array and synthesize `plan`
    // so downstream filter + response shape stay predictable.
    const rawRows = (listRes.data ?? []) as RawRow[];
    let data = rawRows.map((c) => ({
      ...c,
      subscriptions: toSubArray(c.subscriptions).map((s) => ({
        status: s.status,
        trial_ends_at: s.trial_ends_at,
        plan:
          s.status === "trialing"
            ? "trial"
            : s.pro_started_at || s.status === "active"
              ? "pro"
              : null,
      })),
    }));

    // Post-hoc filters (applied in TS because company_health is a view, not
    // joinable in a single PostgREST query without denorm).
    if (q.view === "at_risk" || q.minHealth !== undefined || q.maxHealth !== undefined) {
      const lo = q.minHealth ?? (q.view === "at_risk" ? 0 : 0);
      const hi = q.maxHealth ?? (q.view === "at_risk" ? 39 : 100);
      data = data.filter((c) => {
        const score = healthMap.get(c.id) ?? 0;
        return score >= lo && score <= hi;
      });
    }

    if (q.plan !== "all") {
      data = data.filter((c) => c.subscriptions?.some((s) => s.plan === q.plan));
    }

    const enriched = data.map((c) => ({
      ...c,
      health_score: healthMap.get(c.id) ?? null,
    }));

    return NextResponse.json({
      data: enriched,
      total: listRes.count ?? 0,
      page: q.page,
      limit: q.limit,
    });
  } catch (err) {
    logger.error({ err }, "[api/operator/companies] unexpected error");
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
