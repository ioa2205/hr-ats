import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod/v4";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

// Per-company registry of OWNED Telegram CV channels the TezHR bot ingests.
// The bot must be an administrator of each channel; posts are then staged into
// telegram_posts and read by the sourcing funnel (no MTProto session).

// Telegram public usernames: 5–32 chars, start with a letter, [a-z0-9_].
const HandleBody = z.object({
  handle: z
    .string()
    .trim()
    .transform((s) => s.replace(/^@/, "").toLowerCase())
    .pipe(z.string().regex(/^[a-z][a-z0-9_]{4,31}$/, "invalid_handle")),
});

// GET — list the company's registered channels.
export async function GET() {
  const access = await requireCompanyAccessApi();
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("telegram_intake_channels")
    .select("id, handle, chat_id, title, active, created_at")
    .eq("company_id", access.companyId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error({ err: error, companyId: access.companyId }, "[sourcing] list tg channels failed");
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
  return NextResponse.json({ channels: data ?? [] });
}

// POST — register a channel handle. Write access required. A handle is claimed
// by exactly one company (global unique index) → a second claim returns 409.
export async function POST(request: NextRequest) {
  const access = await requireCompanyAccessApi({ requireWrite: true });
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });

  let handle: string;
  try {
    handle = HandleBody.parse(await request.json()).handle;
  } catch {
    return NextResponse.json({ error: "invalid_handle" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("telegram_intake_channels")
    .insert({ company_id: access.companyId, handle, added_by: access.user.id })
    .select("id, handle, chat_id, title, active, created_at")
    .single();

  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "channel_taken" }, { status: 409 });
    }
    logger.error({ err: error, companyId: access.companyId }, "[sourcing] add tg channel failed");
    return NextResponse.json({ error: "add_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: access.user.id,
    company_id: access.companyId,
    actor: "hr",
    action: "sourcing.telegram_channel.added",
    entity_type: "telegram_intake_channel",
    entity_id: data.id,
    metadata: { handle },
  });

  return NextResponse.json({ channel: data }, { status: 201 });
}
