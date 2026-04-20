import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCompanyAccessApi } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const bool = z.boolean();
const hour = z.number().int().min(0).max(23);
const nullableHour = z
  .number()
  .int()
  .min(0)
  .max(23)
  .nullable();

const preferencesSchema = z.object({
  email_new_application: bool,
  email_top_pick: bool,
  email_interview_booked: bool,
  email_interview_declined: bool,
  email_quota_warning: bool,
  email_weekly_digest: bool,
  inapp_new_application: bool,
  inapp_top_pick: bool,
  inapp_interview_booked: bool,
  inapp_interview_declined: bool,
  inapp_ai_failed: bool,
  digest_hour: hour,
  quiet_hours_start: nullableHour,
  quiet_hours_end: nullableHour,
});

export async function GET() {
  const access = await requireCompanyAccessApi();
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", access.user.id)
    .eq("company_id", access.companyId)
    .maybeSingle();

  if (error) {
    logger.error({ err: error }, "[notifications] prefs load failed");
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  if (!data) {
    const { data: inserted, error: insErr } = await admin
      .from("notification_preferences")
      .insert({ user_id: access.user.id, company_id: access.companyId })
      .select("*")
      .single();
    if (insErr || !inserted) {
      logger.error({ err: insErr }, "[notifications] prefs insert failed");
      return NextResponse.json({ error: "load_failed" }, { status: 500 });
    }
    return NextResponse.json(inserted);
  }
  return NextResponse.json(data);
}

export async function PUT(req: Request) {
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

  const parsed = preferencesSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: before } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", access.user.id)
    .eq("company_id", access.companyId)
    .maybeSingle();

  const { data: after, error } = await admin
    .from("notification_preferences")
    .upsert(
      { user_id: access.user.id, company_id: access.companyId, ...parsed.data },
      { onConflict: "user_id,company_id" },
    )
    .select("*")
    .single();

  if (error || !after) {
    logger.error({ err: error }, "[notifications] prefs save failed");
    return NextResponse.json({ error: "save_failed" }, { status: 500 });
  }

  await admin.from("audit_log").insert({
    company_id: access.companyId,
    actor: "hr",
    actor_user_id: access.user.id,
    action: "settings.notifications.update",
    entity_type: "notification_preferences",
    entity_id: after.id,
    metadata: { before, after },
  });

  return NextResponse.json(after);
}
