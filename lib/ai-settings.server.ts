import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  AI_SETTING_KEYS,
  DEFAULT_AI_SETTINGS,
  type AiSettings,
  type AiTone,
} from "./ai-settings";

function parseBool(v: string | undefined, fallback: boolean): boolean {
  if (v === undefined) return fallback;
  return v === "true";
}

function parseInt0_60(v: string | undefined, fallback: number): number {
  if (v === undefined) return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(60, n));
}

function parseTone(v: string | undefined, fallback: AiTone): AiTone {
  return v === "direct" || v === "neutral" || v === "generous" ? v : fallback;
}

function parseCount(v: string | undefined, fallback: 5 | 6 | 7): 5 | 6 | 7 {
  const n = Number.parseInt(v ?? "", 10);
  if (n === 5 || n === 6 || n === 7) return n;
  return fallback;
}

/**
 * Reads all AI settings in one query and fills in defaults for missing keys.
 * Stored per-company in the `company_settings` key/value table (chosen over a
 * new jsonb column because every key flows through the existing CRUD + RLS +
 * audit pipeline).
 */
export async function getAiSettings(companyId: string): Promise<AiSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("company_settings")
    .select("key, value")
    .eq("company_id", companyId)
    .in("key", Object.values(AI_SETTING_KEYS));

  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  return {
    autoScreenEnabled: parseBool(
      map.get(AI_SETTING_KEYS.autoScreenEnabled),
      DEFAULT_AI_SETTINGS.autoScreenEnabled,
    ),
    autoRejectThreshold: parseInt0_60(
      map.get(AI_SETTING_KEYS.autoRejectThreshold),
      DEFAULT_AI_SETTINGS.autoRejectThreshold,
    ),
    tone: parseTone(map.get(AI_SETTING_KEYS.tone), DEFAULT_AI_SETTINGS.tone),
    interviewQuestionsAutoGenerate: parseBool(
      map.get(AI_SETTING_KEYS.interviewQuestionsAutoGenerate),
      DEFAULT_AI_SETTINGS.interviewQuestionsAutoGenerate,
    ),
    interviewQuestionCount: parseCount(
      map.get(AI_SETTING_KEYS.interviewQuestionCount),
      DEFAULT_AI_SETTINGS.interviewQuestionCount,
    ),
  };
}
