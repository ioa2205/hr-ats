import { NextResponse } from "next/server";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

interface UpgradeRequestRow {
  id: string;
  company_id: string;
  requested_by: string;
  plan_id: string;
  source: string;
  request_note: string | null;
  created_at: string;
}

export async function GET() {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscription_upgrade_requests")
    .select("id, company_id, requested_by, plan_id, source, request_note, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as UpgradeRequestRow[];
  const companyIds = Array.from(new Set(rows.map((r) => r.company_id)));
  const requesterIds = Array.from(new Set(rows.map((r) => r.requested_by)));
  const planIds = Array.from(new Set(rows.map((r) => r.plan_id)));

  const [companiesRes, profilesRes, plansRes] = await Promise.all([
    companyIds.length
      ? admin.from("companies").select("id, name, slug").in("id", companyIds)
      : Promise.resolve({ data: [] }),
    requesterIds.length
      ? admin.from("profiles").select("id, email, full_name").in("id", requesterIds)
      : Promise.resolve({ data: [] }),
    planIds.length
      ? admin.from("subscription_plans").select("id, code, name_en, price_uzs").in("id", planIds)
      : Promise.resolve({ data: [] }),
  ]);

  const companyMap = new Map(
    ((companiesRes.data ?? []) as Array<{ id: string; name: string; slug: string }>).map((c) => [
      c.id,
      c,
    ]),
  );
  const profileMap = new Map(
    (
      (profilesRes.data ?? []) as Array<{
        id: string;
        email: string | null;
        full_name: string | null;
      }>
    ).map((p) => [p.id, p]),
  );
  const planMap = new Map(
    (
      (plansRes.data ?? []) as Array<{
        id: string;
        code: string;
        name_en: string;
        price_uzs: number | string;
      }>
    ).map((p) => [p.id, p]),
  );

  return NextResponse.json({
    data: rows.map((r) => {
      const company = companyMap.get(r.company_id);
      const requester = profileMap.get(r.requested_by);
      const plan = planMap.get(r.plan_id);

      return {
        id: r.id,
        companyId: r.company_id,
        companyName: company?.name ?? "Unknown company",
        companySlug: company?.slug ?? null,
        requesterId: r.requested_by,
        requesterLabel: requester?.full_name ?? requester?.email ?? "Unknown user",
        requesterEmail: requester?.email ?? null,
        planCode: plan?.code ?? null,
        planName: plan?.name_en ?? "Pro",
        priceUzs: plan?.price_uzs ?? null,
        source: r.source,
        requestNote: r.request_note,
        createdAt: r.created_at,
      };
    }),
  });
}
