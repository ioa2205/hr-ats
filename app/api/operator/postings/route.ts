import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const auth = await requireOperatorApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("job_postings")
      .select("*, candidates(count), company:companies(name)")
      .order("created_at", { ascending: false });

    if (error) {
      logger.error({ err: error }, "[api/operator/postings] fetch failed");
      return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    logger.error({ err }, "[api/operator/postings] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
