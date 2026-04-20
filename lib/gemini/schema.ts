import { z } from "zod/v4";

/**
 * JSON Schema passed to Gemini's responseSchema — constrains decoder output.
 * The analysis is produced simultaneously in Russian, Uzbek, and English so
 * every HR user sees it in their own interface locale.
 */
export const analysisSchema = {
  type: "object",
  properties: {
    match_score: { type: "integer", minimum: 0, maximum: 100 },
    language_detected: {
      type: "string",
      enum: ["uz", "ru", "en", "other"],
    },
    one_line_summary_ru: { type: "string", maxLength: 150 },
    one_line_summary_uz: { type: "string", maxLength: 180 },
    one_line_summary_en: { type: "string", maxLength: 150 },
    strengths_ru: {
      type: "array",
      items: { type: "string", maxLength: 120 },
      minItems: 1,
      maxItems: 5,
    },
    strengths_uz: {
      type: "array",
      items: { type: "string", maxLength: 140 },
      minItems: 1,
      maxItems: 5,
    },
    strengths_en: {
      type: "array",
      items: { type: "string", maxLength: 120 },
      minItems: 1,
      maxItems: 5,
    },
    gaps_ru: {
      type: "array",
      items: { type: "string", maxLength: 120 },
      minItems: 0,
      maxItems: 5,
    },
    gaps_uz: {
      type: "array",
      items: { type: "string", maxLength: 140 },
      minItems: 0,
      maxItems: 5,
    },
    gaps_en: {
      type: "array",
      items: { type: "string", maxLength: 120 },
      minItems: 0,
      maxItems: 5,
    },
  },
  required: [
    "match_score",
    "language_detected",
    "one_line_summary_ru",
    "one_line_summary_uz",
    "one_line_summary_en",
    "strengths_ru",
    "strengths_uz",
    "strengths_en",
    "gaps_ru",
    "gaps_uz",
    "gaps_en",
  ],
} as const;

/**
 * Runtime Zod validation — mirrors analysisSchema so we catch any edge-case
 * where Gemini drifts outside the schema.
 */
export const AnalysisZod = z.object({
  match_score: z.number().int().min(0).max(100),
  language_detected: z.enum(["uz", "ru", "en", "other"]),
  one_line_summary_ru: z.string().min(1).max(150),
  one_line_summary_uz: z.string().min(1).max(180),
  one_line_summary_en: z.string().min(1).max(150),
  strengths_ru: z.array(z.string().min(1).max(120)).min(1).max(5),
  strengths_uz: z.array(z.string().min(1).max(140)).min(1).max(5),
  strengths_en: z.array(z.string().min(1).max(120)).min(1).max(5),
  gaps_ru: z.array(z.string().min(1).max(120)).min(0).max(5),
  gaps_uz: z.array(z.string().min(1).max(140)).min(0).max(5),
  gaps_en: z.array(z.string().min(1).max(120)).min(0).max(5),
});

export type Analysis = z.infer<typeof AnalysisZod>;
