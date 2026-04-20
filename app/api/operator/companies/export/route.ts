import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

const MAX_ROWS = 10_000;

export async function GET(request: NextRequest) {
  const auth = await requireOperatorApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const admin = createAdminClient();
  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  try {
    let query = admin
      .from("companies")
      .select(
        "id, name, slug, status, default_locale, created_at, subscriptions(status, trial_ends_at, pro_started_at), company_members(count)",
      )
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);

    if (status && ["active", "suspended"].includes(status)) {
      query = query.eq("status", status);
    }
    if (search) {
      const like = search.replace(/[\\%_]/g, (c) => `\\${c}`);
      query = query.or(`name.ilike.%${like}%,slug.ilike.%${like}%`);
    }

    const [listRes, healthRes] = await Promise.all([
      query,
      admin.from("company_health").select("company_id, score"),
    ]);
    if (listRes.error) throw listRes.error;

    const healthMap = new Map<string, number>(
      (healthRes.data ?? []).map((r) => [r.company_id as string, Number(r.score)]),
    );

    const header = [
      "id",
      "name",
      "slug",
      "status",
      "plan",
      "sub_status",
      "trial_ends_at",
      "member_count",
      "health_score",
      "default_locale",
      "created_at",
    ];
    const lines = [header.join(",")];
    type RawSub = {
      status: string;
      trial_ends_at: string | null;
      pro_started_at: string | null;
    };
    for (const c of (listRes.data ?? []) as Array<{
      id: string;
      name: string;
      slug: string;
      status: string;
      default_locale: string;
      created_at: string;
      // One-to-one embed (PK FK) surfaces as an object, not an array.
      subscriptions: RawSub | RawSub[] | null;
      company_members: { count: number }[] | null;
    }>) {
      const subs = !c.subscriptions
        ? []
        : Array.isArray(c.subscriptions)
          ? c.subscriptions
          : [c.subscriptions];
      const sub = subs[0];
      // Derive plan from status + pro_started_at (no `plan` column exists).
      const plan = !sub
        ? ""
        : sub.status === "trialing"
          ? "trial"
          : sub.pro_started_at || sub.status === "active"
            ? "pro"
            : "";
      const row = [
        c.id,
        c.name,
        c.slug,
        c.status,
        plan,
        sub?.status ?? "",
        sub?.trial_ends_at ?? "",
        String(c.company_members?.[0]?.count ?? 0),
        String(healthMap.get(c.id) ?? ""),
        c.default_locale,
        c.created_at,
      ].map((v) => csvEscape(String(v)));
      lines.push(row.join(","));
    }

    const date = new Date().toISOString().slice(0, 10);
    const filterHash = [status ?? "all", search ?? ""].join("_").replace(/[^a-z0-9_]/gi, "");
    const filename = `tezhr-companies-${filterHash}-${date}.csv`;

    return new NextResponse(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    logger.error({ err }, "[api/operator/companies/export] failed");
    return NextResponse.json({ error: "export_failed" }, { status: 500 });
  }
}

function csvEscape(v: string): string {
  if (v === "") return "";
  if (/[",\n\r]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
  return v;
}
