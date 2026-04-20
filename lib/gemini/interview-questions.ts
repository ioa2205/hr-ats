import {
  callGeminiProJson,
  type ProCallResult,
} from "./call-pro";
import {
  MODEL,
  INPUT_USD_PER_MTOK,
  OUTPUT_USD_PER_MTOK,
} from "./client";
import {
  InterviewQuestionsResponseZod,
  QUESTION_FOCUSES,
  type InterviewQuestionsResponse,
  type StoredInterviewQuestions,
} from "./interview-questions-types";

export {
  QUESTION_FOCUSES,
  INTERVIEW_QUESTIONS_MODEL_TAG,
  InterviewQuestionsResponseZod,
  parseStoredInterviewQuestions,
} from "./interview-questions-types";
export type {
  InterviewQuestionItem,
  InterviewQuestionsResponse,
  QuestionFocus,
  StoredInterviewQuestions,
} from "./interview-questions-types";

const questionItemSchema = {
  type: "object",
  properties: {
    question: { type: "string", maxLength: 240 },
    rationale: { type: "string", maxLength: 200 },
    focus: { type: "string", enum: QUESTION_FOCUSES as unknown as string[] },
  },
  required: ["question", "rationale", "focus"],
} as const;

const questionArraySchema = {
  type: "array",
  items: questionItemSchema,
  minItems: 5,
  maxItems: 7,
} as const;

export const interviewQuestionsResponseSchema = {
  type: "object",
  properties: {
    ru: questionArraySchema,
    uz: questionArraySchema,
    en: questionArraySchema,
  },
  required: ["ru", "uz", "en"],
} as const;

interface JobForPrompt {
  title: string;
  description: string;
  required_skills: string[];
}

interface CandidateForPrompt {
  full_name: string;
  match_score: number | null;
  one_line_summary: string | null;
  strengths: string[] | null;
  gaps: string[] | null;
  language_detected: string | null;
}

import { toneInstruction, type AiTone } from "@/lib/ai-settings";

export function buildInterviewQuestionsPrompt(input: {
  job: JobForPrompt;
  candidate: CandidateForPrompt;
  tone?: AiTone;
  questionCount?: 5 | 6 | 7;
}): { systemInstruction: string; userPrompt: string } {
  const { job, candidate, tone = "neutral", questionCount = 6 } = input;
  const skills = job.required_skills.length
    ? job.required_skills.join(", ")
    : "not specified";

  const systemInstruction = `You are a senior HR interviewer drafting a tailored interview script
based on a candidate's CV analysis and the job posting they applied for.
Return ONLY valid JSON matching the provided schema. No markdown, no preamble.

=== ETHICAL GUARDRAILS (HARD) ===
NEVER ask about: age, marital status, children, family plans,
nationality, religion, political views, health status, disability,
sexual orientation, military exemption status. Refuse generic filler
like "tell me about yourself", "what is your greatest weakness", or
brain-teaser puzzles unrelated to the role.

=== GROUNDING RULE ===
EVERY question must be traceable to one of:
  (a) a specific strength claimed in the CV analysis,
  (b) a specific gap identified in the CV analysis,
  (c) a requirement explicit in the job posting.
The "rationale" field cites the exact evidence in one short sentence.
If you cannot ground a question in (a)–(c), do not include it.

=== MIX (per locale) ===
Produce exactly ${questionCount} items per locale. Aim for:
  ~50% strength_probe — verify the strongest claimed skills with
       behavior-specific questions ("Walk me through a time when…").
  ~30% gap_probe — open-ended, not gotcha. Surface whether the gap is
       a true blocker or merely missing from the CV.
  ~20% role_fit / behavioral / signal_check — judgment, collaboration,
       motivation. Use behavioral or role_fit where appropriate.
Difficulty gradient: start with a warmup tied to the strongest strength,
end with the hardest gap-probe.

=== TRILINGUAL OUTPUT ===
Produce the SAME questions simultaneously in Russian (ru), Uzbek
Latin (uz), and English (en). Same evidence, same focus tag, same
intent — not literal word-for-word.
- Russian: Standard business Russian as used in Uzbek corporate contexts.
- Uzbek: Latin script only. Direct, modern, no archaisms.
- English: Clear US-style business English. No British spellings.

=== FORMAT RULES ===
- question ≤ 240 chars in any locale.
- rationale ≤ 200 chars; cite specific CV evidence ("3yr at Epam",
  "Listed PyTorch but no projects shown") or a posting requirement.
- focus ∈ {strength_probe, gap_probe, role_fit, behavioral, signal_check}.

=== JOB POSTING ===
Title: ${job.title}
Required skills: ${skills}
Description: ${job.description}

=== CANDIDATE (CV ANALYSIS) ===
Name: ${candidate.full_name}
Detected CV language: ${candidate.language_detected ?? "unknown"}
Match score: ${candidate.match_score ?? "n/a"}/100
Summary: ${candidate.one_line_summary ?? "—"}
Strengths:
${(candidate.strengths ?? []).map((s) => `  • ${s}`).join("\n") || "  (none recorded)"}
Gaps:
${(candidate.gaps ?? []).map((g) => `  • ${g}`).join("\n") || "  (none recorded)"}${toneInstruction(tone)}`;

  const userPrompt = `Draft the interview question set for ${candidate.full_name} for the role of ${job.title}.`;

  return { systemInstruction, userPrompt };
}

export interface GenerateInterviewQuestionsResult {
  parsed: InterviewQuestionsResponse;
  stored: StoredInterviewQuestions;
  call: ProCallResult;
  costUsd: number;
}

/**
 * Calls Gemini Pro with the interview-questions prompt and validates the
 * response against the strict Zod schema. Returns both the parsed shape and
 * the wrapped storage shape (with `generated_at` + `model`) so the caller
 * can persist + log in one go.
 *
 * Throws when the response doesn't match the schema after one model call —
 * we don't auto-retry; the API route surfaces a generic error to the user.
 */
export async function generateInterviewQuestions(input: {
  job: JobForPrompt;
  candidate: CandidateForPrompt;
  tone?: AiTone;
  questionCount?: 5 | 6 | 7;
}): Promise<GenerateInterviewQuestionsResult> {
  const { systemInstruction, userPrompt } = buildInterviewQuestionsPrompt(input);

  const call = await callGeminiProJson({
    systemInstruction,
    userPrompt,
    responseSchema: interviewQuestionsResponseSchema,
    temperature: 0.4,
    maxOutputTokens: 4096,
  });

  let json: unknown;
  try {
    json = JSON.parse(call.text);
  } catch {
    throw new Error("interview_questions_invalid_json");
  }

  const result = InterviewQuestionsResponseZod.safeParse(json);
  if (!result.success) {
    throw new Error("interview_questions_schema_mismatch");
  }

  const stored: StoredInterviewQuestions = {
    generated_at: new Date().toISOString(),
    model: MODEL,
    ru: result.data.ru,
    uz: result.data.uz,
    en: result.data.en,
  };

  const inputCost = ((call.promptTokens ?? 0) / 1_000_000) * INPUT_USD_PER_MTOK;
  const outputCost = ((call.outputTokens ?? 0) / 1_000_000) * OUTPUT_USD_PER_MTOK;

  return {
    parsed: result.data,
    stored,
    call,
    costUsd: inputCost + outputCost,
  };
}

