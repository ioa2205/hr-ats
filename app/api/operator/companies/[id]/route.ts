import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireOperatorApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const admin = createAdminClient();

    const [companyResult, membersResult, usageResult, subscriptionResult] = await Promise.all([
      admin.from("companies").select("*").eq("id", id).single(),

      admin
        .from("company_members")
        .select("*, profile:profiles(id, email, full_name, avatar_url)")
        .eq("company_id", id)
        .order("created_at", { ascending: true }),

      admin.from("company_usage_30d").select("*").eq("company_id", id).maybeSingle(),

      admin.from("subscriptions").select("*").eq("company_id", id).maybeSingle(),
    ]);

    if (companyResult.error || !companyResult.data) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    return NextResponse.json({
      company: companyResult.data,
      members: membersResult.data ?? [],
      usage: usageResult.data,
      subscription: subscriptionResult.data,
    });
  } catch (err) {
    logger.error({ err }, "[api/operator/companies/[id]] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
