import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { saveTemplatesSchema } from "@/lib/validations/team";
import { logger } from "@/lib/logger";

export async function GET() {
  const access = await requireCompanyAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();

  // Fetch company overrides
  const { data: overrides } = await admin
    .from("company_settings")
    .select("key, value")
    .eq("company_id", access.companyId)
    .in("key", ["telegram_invite_ru", "telegram_invite_uz", "telegram_invite_en"]);

  // Fetch platform defaults as fallback
  const { data: defaults } = await admin
    .from("platform_settings")
    .select("key, value")
    .in("key", ["telegram_invite_ru", "telegram_invite_uz", "telegram_invite_en"]);

  const defaultMap = new Map((defaults ?? []).map((d) => [d.key, d.value]));
  const overrideMap = new Map((overrides ?? []).map((o) => [o.key, o.value]));

  return NextResponse.json({
    telegram_invite_ru:
      overrideMap.get("telegram_invite_ru") ?? defaultMap.get("telegram_invite_ru") ?? "",
    telegram_invite_uz:
      overrideMap.get("telegram_invite_uz") ?? defaultMap.get("telegram_invite_uz") ?? "",
    telegram_invite_en:
      overrideMap.get("telegram_invite_en") ?? defaultMap.get("telegram_invite_en") ?? "",
    has_overrides: overrideMap.size > 0,
  });
}

export async function PUT(request: NextRequest) {
  const access = await requireCompanyAccessApi({
    roles: ["owner", "admin"],
    requireWrite: true,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = saveTemplatesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Upsert both template keys
  const { error } = await admin.from("company_settings").upsert(
    [
      {
        company_id: access.companyId,
        key: "telegram_invite_ru",
        value: parsed.data.telegram_invite_ru,
        updated_at: now,
      },
      {
        company_id: access.companyId,
        key: "telegram_invite_uz",
        value: parsed.data.telegram_invite_uz,
        updated_at: now,
      },
      {
        company_id: access.companyId,
        key: "telegram_invite_en",
        value: parsed.data.telegram_invite_en,
        updated_at: now,
      },
    ],
    { onConflict: "company_id,key" },
  );

  if (error) {
    logger.error({ err: error.message }, "[api/hr/team/templates] upsert failed");
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: access.user.id,
    company_id: access.companyId,
    actor: "hr",
    action: "settings.templates.update",
    entity_type: "company_settings",
    entity_id: access.companyId,
    metadata: { keys: ["telegram_invite_ru", "telegram_invite_uz", "telegram_invite_en"] },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const access = await requireCompanyAccessApi({
    roles: ["owner", "admin"],
    requireWrite: true,
  });
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("company_settings")
    .delete()
    .eq("company_id", access.companyId)
    .in("key", ["telegram_invite_ru", "telegram_invite_uz", "telegram_invite_en"]);

  if (error) {
    logger.error({ err: error.message }, "[api/hr/team/templates] delete overrides failed");
    return NextResponse.json({ error: "reset_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
