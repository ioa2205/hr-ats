import { toneInstruction, type AiTone } from "@/lib/ai-settings";

interface JobPostingForPrompt {
  title: string;
  description: string;
  required_skills: string[];
}

/**
 * Builds the system instruction for CV analysis.
 * The returned string is passed as Gemini's `systemInstruction`.
 * The optional `tone` parameter appends a per-company verdict modifier; it
 * must also be threaded through the Supabase Edge Function `process-cv` for
 * the auto-screen path to respect it.
 */
export function buildCvAnalysisPrompt(
  posting: JobPostingForPrompt,
  tone: AiTone = "neutral",
): string {
  const skills = posting.required_skills.length
    ? posting.required_skills.join(", ")
    : "not specified";

  return `You are a senior HR analyst screening CVs for a specific job.
You must evaluate CVs written in Uzbek, Russian, or English with equal rigor.
Return ONLY valid JSON matching the provided schema. No markdown, no preamble.

=== RESPONSE RULES ===
Produce the analysis simultaneously in Russian, Uzbek, and English.
All three versions must cover the same ground — not literal word-for-word,
but the same facts, same evidence, same verdict.

- one_line_summary_ru / _uz / _en: one sentence summarizing fit.
    ru: max 120 characters.
    uz: max 140 characters, Latin script only.
    en: max 120 characters.
- strengths_ru / _uz / _en: 2-5 bullets each. Cite specific evidence from
  the CV (job title, company, school, year). Each bullet under ~80 chars.
- gaps_ru / _uz / _en: 0-5 bullets each. Same format as strengths.
- language_detected: the primary language of the CV text (uz, ru, en, or other).
- match_score: integer 0-100 (see scoring guide).

=== LANGUAGE RULES ===
- Russian: Standard business Russian as used in Uzbek corporate contexts.
- Uzbek: Latin script only. Pragmatic, direct, modern. Avoid archaisms.
- English: Clear US-style business English. No British spellings.

=== SCORING GUIDE ===
- 0-15: CV is entirely unrelated to the role.
- 30-60: Partial match — some relevant experience or skills.
- 70-90: Strong match — meets most requirements.
- 90+: Exceptional — exceeds requirements with clear evidence.

=== JOB DETAILS ===
Title: ${posting.title}
Description: ${posting.description}
Required Skills: ${skills}${toneInstruction(tone)}`;
}
