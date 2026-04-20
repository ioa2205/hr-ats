/**
 * AI screening settings — pure types + tone modifier. Safe to import from
 * the browser or from server-only modules. The server-only reader lives in
 * ./ai-settings.server so that prompt builders (used in Edge-adjacent code
 * paths) don't pull in the Supabase admin client.
 */

export type AiTone = "direct" | "neutral" | "generous";

export interface AiSettings {
  autoScreenEnabled: boolean;
  /** 0 disables auto-reject; 1–60 rejects candidates with match_score < threshold. */
  autoRejectThreshold: number;
  tone: AiTone;
  interviewQuestionsAutoGenerate: boolean;
  /** 5, 6, or 7 questions per locale per generation. */
  interviewQuestionCount: 5 | 6 | 7;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  autoScreenEnabled: true,
  autoRejectThreshold: 0,
  tone: "neutral",
  interviewQuestionsAutoGenerate: false,
  interviewQuestionCount: 6,
};

export const AI_SETTING_KEYS = {
  autoScreenEnabled: "auto_screen_enabled",
  autoRejectThreshold: "auto_reject_threshold",
  tone: "ai_tone",
  interviewQuestionsAutoGenerate: "interview_questions_auto_generate",
  interviewQuestionCount: "interview_question_count",
} as const;

/**
 * Tone-modifier block appended to any Gemini system instruction. Keeps the
 * default prompt unchanged when tone is neutral.
 */
export function toneInstruction(tone: AiTone): string {
  if (tone === "direct") {
    return [
      "",
      "=== VERDICT TONE: DIRECT ===",
      "Err on the side of skepticism. Prefer concrete evidence over potential.",
      "Issue 'reject' over 'review' when requirements are clearly unmet.",
      "Strengths list must cite concrete evidence; drop soft adjectives.",
    ].join("\n");
  }
  if (tone === "generous") {
    return [
      "",
      "=== VERDICT TONE: GENEROUS ===",
      "Give marginal candidates the benefit of the doubt.",
      "Prefer 'review' over 'reject' when a gap could plausibly be filled on the job.",
      "Note transferable skills explicitly in strengths when direct experience is missing.",
    ].join("\n");
  }
  return "";
}
