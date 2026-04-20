import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireOperatorApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/**
 * Read + write platform-wide settings from the `platform_settings` KV.
 * Surfaces the toggle set defined in the spec: maintenance, signup, Gemini
 * model override, trial length, default quotas.
 */

const WRITABLE_KEYS = [
  "maintenance_mode",
  "signup_paused",
  "gemini_model",
  "trial_length_days",
  "default_cv_quota",
  "default_job_quota",
] as const;
type WritableKey = (typeof WRITABLE_KEYS)[number];

const patchSchema = z.object({
  key: z.enum(WRITABLE_KEYS),
  value: z.string().max(200),
  reason: z.string().trim().min(10).max(1000),
});

export async function GET() {
  const auth = await requireOperatorApi();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_settings")
    .select("key, value")
    .in("key", [...WRITABLE_KEYS]);
  const out: Partial<Record<WritableKey, string>> = {};
  for (const k of WRITABLE_KEYS) out[k] = "";
  for (const r of data ?? []) {
    if ((WRITABLE_KEYS as readonly string[]).includes(r.key as string)) {
      out[r.key as WritableKey] = String(r.value ?? "");
    }
  }
  return NextResponse.json({ settings: out, role: auth.role });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireOperatorApi({ write: true });
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "validation_failed" }, { status: 400 });

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("platform_settings")
    .select("value")
    .eq("key", parsed.data.key)
    .maybeSingle();

  const { error } = await admin
    .from("platform_settings")
    .upsert({ key: parsed.data.key, value: parsed.data.value }, { onConflict: "key" });
  if (error) {
    logger.error({ err: error }, "[api/operator/settings] upsert failed");
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    actor_user_id: auth.user.id,
    actor: auth.user.email ?? "operator",
    action: "operator.platform_setting_changed",
    entity_type: "platform_setting",
    entity_id: parsed.data.key,
    metadata: {
      key: parsed.data.key,
      before: before?.value ?? null,
      after: parsed.data.value,
      reason: parsed.data.reason,
    },
  });

  return NextResponse.json({ ok: true });
}
