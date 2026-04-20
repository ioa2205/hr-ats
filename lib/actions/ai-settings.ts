"use server";

import { z } from "zod";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { AI_SETTING_KEYS, type AiSettings } from "@/lib/ai-settings";
import { getAiSettings } from "@/lib/ai-settings.server";
import { revalidatePath } from "next/cache";

const schema = z.object({
  autoScreenEnabled: z.boolean(),
  autoRejectThreshold: z.number().int().min(0).max(60),
  tone: z.enum(["direct", "neutral", "generous"]),
  interviewQuestionsAutoGenerate: z.boolean(),
  interviewQuestionCount: z.union([z.literal(5), z.literal(6), z.literal(7)]),
});

export type SaveAiSettingsResult = { ok: true } | { ok: false; error: string };

export async function saveAiSettings(input: unknown): Promise<SaveAiSettingsResult> {
  const { user, companyId, role } = await requireCompanyAccess({
    roles: ["owner", "admin"],
  });
  if (role !== "owner" && role !== "admin") {
    return { ok: false, error: "insufficient_role" };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const before = await getAiSettings(companyId);

  const admin = createAdminClient();
  const rows = [
    { key: AI_SETTING_KEYS.autoScreenEnabled, value: String(parsed.data.autoScreenEnabled) },
    {
      key: AI_SETTING_KEYS.autoRejectThreshold,
      value: String(parsed.data.autoRejectThreshold),
    },
    { key: AI_SETTING_KEYS.tone, value: parsed.data.tone },
    {
      key: AI_SETTING_KEYS.interviewQuestionsAutoGenerate,
      value: String(parsed.data.interviewQuestionsAutoGenerate),
    },
    {
      key: AI_SETTING_KEYS.interviewQuestionCount,
      value: String(parsed.data.interviewQuestionCount),
    },
  ].map((r) => ({ ...r, company_id: companyId }));

  const { error } = await admin.from("company_settings").upsert(rows, {
    onConflict: "company_id,key",
  });

  if (error) {
    logger.error({ err: error, companyId }, "[ai-settings] save failed");
    return { ok: false, error: "generic" };
  }

  const after: AiSettings = parsed.data;

  await admin.from("audit_log").insert({
    company_id: companyId,
    actor: "hr",
    actor_user_id: user.id,
    action: "settings.ai.update",
    entity_type: "company_settings",
    entity_id: null,
    metadata: { before, after },
  });

  revalidatePath("/hr/settings/ai");

  return { ok: true };
}
