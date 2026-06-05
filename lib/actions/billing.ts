"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const cancelSchema = z.object({
  reason: z.enum(["too_expensive", "missing_feature", "no_need", "other"]),
  notes: z.string().max(2000).optional(),
});

const upgradeSchema = z.object({
  source: z.enum(["billing_settings", "landing_intent"]).optional(),
});

const PRO_PLAN_CODE = "pro_monthly_flat";

export type BillingActionResult =
  | { ok: true; status?: "created" | "pending" | "already_pro"; requestId?: string }
  | { ok: false; error: string };

async function currentActor() {
  const { user, companyId } = await requireCompanyAccess();
  const admin = createAdminClient();
  const [{ data: profile }, { data: company }] = await Promise.all([
    admin.from("profiles").select("full_name, email, locale").eq("id", user.id).single(),
    admin.from("companies").select("name").eq("id", companyId).single(),
  ]);
  return {
    userId: user.id,
    companyId,
    email: profile?.email ?? user.email ?? "unknown",
    fullName: profile?.full_name ?? "HR user",
    locale: profile?.locale ?? "ru",
    companyName: company?.name ?? "—",
  };
}

export async function requestUpgrade(input: unknown): Promise<BillingActionResult> {
  const parsed = upgradeSchema.safeParse(input ?? {});
  if (!parsed.success) return { ok: false, error: "invalid" };

  const actor = await currentActor();

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit({
    key: `billing-upgrade:${actor.userId}:${ip}`,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!rl.allowed) return { ok: false, error: "too_many" };

  const admin = createAdminClient();
  const [{ data: subscription }, { data: plan }] = await Promise.all([
    admin.from("subscriptions").select("status").eq("company_id", actor.companyId).maybeSingle(),
    admin.from("subscription_plans").select("id, active").eq("code", PRO_PLAN_CODE).maybeSingle(),
  ]);

  if (subscription?.status === "active") return { ok: true, status: "already_pro" };
  if (!plan || !plan.active) return { ok: false, error: "plan_not_found" };

  const { data: existing } = await admin
    .from("subscription_upgrade_requests")
    .select("id")
    .eq("company_id", actor.companyId)
    .eq("plan_id", plan.id)
    .eq("status", "pending")
    .maybeSingle();

  if (existing?.id) {
    return { ok: true, status: "pending", requestId: existing.id as string };
  }

  const { data: request, error } = await admin
    .from("subscription_upgrade_requests")
    .insert({
      company_id: actor.companyId,
      requested_by: actor.userId,
      plan_id: plan.id,
      source: parsed.data.source ?? "billing_settings",
    })
    .select("id")
    .single();

  if (error || !request) {
    if (error?.code === "23505") {
      return { ok: true, status: "pending" };
    }
    logger.error({ err: error, userId: actor.userId }, "[billing] upgrade request insert failed");
    return { ok: false, error: "generic" };
  }

  await admin.from("audit_log").insert({
    company_id: actor.companyId,
    actor: "hr",
    actor_user_id: actor.userId,
    action: "settings.billing.request_upgrade",
    entity_type: "subscription_upgrade_request",
    entity_id: request.id,
    metadata: {
      plan_code: PRO_PLAN_CODE,
      source: parsed.data.source ?? "billing_settings",
      company_name: actor.companyName,
    },
  });

  return { ok: true, status: "created", requestId: request.id as string };
}

export async function requestCancel(input: unknown): Promise<BillingActionResult> {
  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const actor = await currentActor();

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const rl = await rateLimit({
    key: `billing-cancel:${actor.userId}:${ip}`,
    limit: 5,
    windowSeconds: 3600,
  });
  if (!rl.allowed) return { ok: false, error: "too_many" };

  const notes = parsed.data.notes?.trim();
  const reasonLine = `[billing-cancel] reason=${parsed.data.reason}${notes ? ` :: ${notes}` : ""}`;

  const admin = createAdminClient();
  const { error } = await admin.from("contact_messages").insert({
    name: actor.fullName,
    email: actor.email,
    company: actor.companyName,
    message: reasonLine,
    locale: actor.locale,
    source: "billing-cancel",
  });
  if (error) {
    logger.error({ err: error, userId: actor.userId }, "[billing] cancel request insert failed");
    return { ok: false, error: "generic" };
  }

  await admin.from("audit_log").insert({
    company_id: actor.companyId,
    actor: "hr",
    actor_user_id: actor.userId,
    action: "settings.billing.request_cancel",
    entity_type: "contact_messages",
    entity_id: null,
    metadata: { reason: parsed.data.reason, notes: notes ?? null },
  });

  return { ok: true };
}
