import { NextResponse } from "next/server";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data } = await admin
    .from("pending_operator_promotions")
    .select("id, target_user_id, proposer_user_id, kind, reason, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  const ids = Array.from(
    new Set(
      (data ?? []).flatMap((r) => [r.target_user_id, r.proposer_user_id]).filter(Boolean),
    ),
  );
  const nameMap = new Map<string, { email: string; full_name: string | null }>();
  if (ids.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ids as string[]);
    for (const p of profiles ?? []) {
      nameMap.set(p.id as string, {
        email: p.email as string,
        full_name: (p.full_name as string | null) ?? null,
      });
    }
  }

  return NextResponse.json({
    data: (data ?? []).map((r) => ({
      id: Number(r.id),
      targetUserId: r.target_user_id as string,
      targetLabel:
        nameMap.get(r.target_user_id as string)?.full_name ??
        nameMap.get(r.target_user_id as string)?.email ??
        "",
      proposerUserId: r.proposer_user_id as string,
      proposerLabel:
        nameMap.get(r.proposer_user_id as string)?.full_name ??
        nameMap.get(r.proposer_user_id as string)?.email ??
        "",
      kind: r.kind as "promote" | "demote",
      reason: r.reason as string,
      createdAt: r.created_at as string,
    })),
  });
}
