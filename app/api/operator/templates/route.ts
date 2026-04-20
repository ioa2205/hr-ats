import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperatorApi } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";
import { z } from "zod";

const ALLOWED_VARIABLES = ["name", "position"];

const settingsSchema = z.object({
  telegram_invite_ru: z.string().min(1).max(2000),
  telegram_invite_uz: z.string().min(1).max(2000),
  telegram_invite_en: z.string().min(1).max(2000),
});

function extractVariables(template: string): string[] {
  const matches = template.match(/\{(\w+)\}/g) ?? [];
  return matches.map((m) => m.slice(1, -1));
}

export async function GET() {
  try {
    const auth = await requireOperatorApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("platform_settings")
      .select("key, value")
      .in("key", ["telegram_invite_ru", "telegram_invite_uz", "telegram_invite_en"]);

    if (error) {
      logger.error({ err: error }, "[api/operator/templates] fetch failed");
      return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
    }

    const settings: Record<string, string> = {};
    for (const row of data ?? []) {
      settings[row.key] = row.value;
    }

    return NextResponse.json(settings);
  } catch (err) {
    logger.error({ err }, "[api/operator/templates] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireOperatorApi();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    for (const [key, template] of Object.entries(parsed.data)) {
      const vars = extractVariables(template);
      const invalid = vars.filter((v) => !ALLOWED_VARIABLES.includes(v));
      if (invalid.length > 0) {
        return NextResponse.json(
          { error: `Invalid variables in ${key}: ${invalid.join(", ")}` },
          { status: 400 },
        );
      }
    }

    const admin = createAdminClient();

    const { data: oldSettings } = await admin
      .from("platform_settings")
      .select("key, value")
      .in("key", ["telegram_invite_ru", "telegram_invite_uz", "telegram_invite_en"]);

    const oldValues: Record<string, string> = {};
    for (const row of oldSettings ?? []) {
      oldValues[row.key] = row.value;
    }

    for (const [key, value] of Object.entries(parsed.data)) {
      const { error } = await admin
        .from("platform_settings")
        .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });

      if (error) {
        logger.error({ err: error, key }, "[api/operator/templates] upsert failed");
        return NextResponse.json({ error: "Save failed" }, { status: 500 });
      }
    }

    await admin.from("audit_log").insert({
      actor_user_id: auth.user.id,
      actor: auth.user.email ?? "operator",
      action: "platform_settings.updated",
      entity_type: "platform_settings",
      metadata: { before: oldValues, after: parsed.data, operator_id: auth.user.id },
    });

    logger.info("[api/operator/templates] templates updated");
    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error({ err }, "[api/operator/templates] unexpected error");
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
