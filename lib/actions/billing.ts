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

export type BillingActionResult = { ok: true } | { ok: false; error: string };

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

// requestUpgrade() removed in pre-GA hardening (P1-8). The Upgrade button now
// redirects to the Click hosted checkout page via /api/billing/checkout.

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
