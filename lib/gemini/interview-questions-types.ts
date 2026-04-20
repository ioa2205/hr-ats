import { z } from "zod/v4";

export const QUESTION_FOCUSES = [
  "strength_probe",
  "gap_probe",
  "role_fit",
  "behavioral",
  "signal_check",
] as const;

export type QuestionFocus = (typeof QUESTION_FOCUSES)[number];

const QuestionItemZod = z.object({
  question: z.string().min(1).max(240),
  rationale: z.string().min(1).max(200),
  focus: z.enum(QUESTION_FOCUSES),
});

const QuestionArrayZod = z.array(QuestionItemZod).min(5).max(7);

export const InterviewQuestionsResponseZod = z.object({
  ru: QuestionArrayZod,
  uz: QuestionArrayZod,
  en: QuestionArrayZod,
});

export type InterviewQuestionItem = z.infer<typeof QuestionItemZod>;
export type InterviewQuestionsResponse = z.infer<
  typeof InterviewQuestionsResponseZod
>;

export interface StoredInterviewQuestions {
  generated_at: string;
  model: string;
  ru: InterviewQuestionItem[];
  uz: InterviewQuestionItem[];
  en: InterviewQuestionItem[];
}

const StoredInterviewQuestionsZod = InterviewQuestionsResponseZod.extend({
  generated_at: z.iso.datetime(),
  model: z.string().min(1),
});

/** Validates a value read from `candidates.ai_interview_questions`. */
export function parseStoredInterviewQuestions(
  value: unknown,
): StoredInterviewQuestions | null {
  const result = StoredInterviewQuestionsZod.safeParse(value);
  return result.success ? result.data : null;
}

/**
 * Telemetry marker stored in `ai_processing_attempts.model` so quota and
 * cost reporting can distinguish interview-question generations from CV
 * analyses (both use the Pro model otherwise). Mirrors `MODEL` in `client.ts`
 * but lives here to avoid pulling the @google/genai SDK into client bundles.
 */
export const INTERVIEW_QUESTIONS_MODEL_TAG = "gemini-3.1-pro-preview/interview-questions";
