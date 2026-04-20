import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const markReadSchema = z.object({
  ids: z.array(z.string().uuid()).optional(),
  all: z.boolean().optional(),
});

export async function GET(req: Request) {
  const access = await requireCompanyAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const url = new URL(req.url);
  const limit = Math.min(50, Number(url.searchParams.get("limit") ?? 20));

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id, event, title, body, entity_type, entity_id, metadata, read_at, created_at")
    .eq("company_id", access.companyId)
    .or(`user_id.eq.${access.user.id},user_id.is.null`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error({ err: error }, "[notifications] list failed");
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}

export async function POST(req: Request) {
  const access = await requireCompanyAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = markReadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (parsed.data.all) {
    const { error } = await admin
      .from("notifications")
      .update({ read_at: now })
      .eq("company_id", access.companyId)
      .or(`user_id.eq.${access.user.id},user_id.is.null`)
      .is("read_at", null);
    if (error) {
      logger.error({ err: error }, "[notifications] mark-all-read failed");
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (parsed.data.ids && parsed.data.ids.length > 0) {
    const { error } = await admin
      .from("notifications")
      .update({ read_at: now })
      .in("id", parsed.data.ids)
      .eq("company_id", access.companyId);
    if (error) {
      logger.error({ err: error }, "[notifications] mark-read failed");
      return NextResponse.json({ error: "save_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "invalid_body" }, { status: 400 });
}
