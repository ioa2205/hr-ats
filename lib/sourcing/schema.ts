/**
 * Structured-output contracts for the four sourcing Gemini calls (Appendices
 * A–D). Each is a paired `as const` JSON Schema (passed to Gemini's
 * responseSchema) + a mirrored Zod schema (runtime validation of the decoded
 * JSON), following the lib/gemini/schema.ts convention. Schema-constrained
 * output is the first line of the zero-hallucination defense; the gate /
 * verification re-derivation in gate.ts is the second.
 */
import { z } from "zod/v4";

// ===================================================================
// A — Requirement profile extraction (Pro). hard_requirements are NOT here:
// the gate is seeded deterministically and never produced by the model.
// ===================================================================

const weightedItemJson = {
  type: "object",
  properties: {
    text: { type: "string", maxLength: 200 },
    weight: { type: "integer", minimum: 1, maximum: 5 },
  },
  required: ["text", "weight"],
} as const;

export const profileExtractionSchema = {
  type: "object",
  properties: {
    must_haves: { type: "array", items: weightedItemJson, maxItems: 20 },
    nice_to_haves: { type: "array", items: weightedItemJson, maxItems: 20 },
    // "" when the posting does not state a seniority — mapped to null on merge.
    seniority: { type: "string", maxLength: 80 },
    required_languages: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        properties: {
          language: { type: "string", enum: ["uz", "ru", "en"] },
          level: { type: "string", maxLength: 60 },
        },
        required: ["language", "level"],
      },
    },
    search_keywords: { type: "array", items: { type: "string", maxLength: 80 }, maxItems: 30 },
  },
  required: ["must_haves", "nice_to_haves", "seniority", "required_languages", "search_keywords"],
} as const;

const WeightedItemZod = z.object({
  text: z.string().min(1).max(200),
  weight: z.number().int().min(1).max(5),
});

export const ProfileExtractionZod = z.object({
  must_haves: z.array(WeightedItemZod).max(20),
  nice_to_haves: z.array(WeightedItemZod).max(20),
  seniority: z.string().max(80),
  required_languages: z
    .array(z.object({ language: z.enum(["uz", "ru", "en"]), level: z.string().min(1).max(60) }))
    .max(3),
  search_keywords: z.array(z.string().min(1).max(80)).max(30),
});

// ===================================================================
// B — Hard-requirement gate (Flash). One entry per requirement.
// ===================================================================

export const gateSchema = {
  type: "object",
  properties: {
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirement_id: { type: "string" },
          met: { type: "boolean" },
          // verbatim quote from <source>; "" is allowed (and means: not a pass).
          evidence: { type: "string", maxLength: 1000 },
          confidence: { type: "number", minimum: 0, maximum: 1 },
        },
        required: ["requirement_id", "met", "evidence", "confidence"],
      },
    },
  },
  required: ["requirements"],
} as const;

export const GateResultsZod = z.object({
  requirements: z.array(
    z.object({
      requirement_id: z.string().min(1),
      met: z.boolean(),
      evidence: z.string().max(1000),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

// ===================================================================
// C — Deep scoring (Pro). Fixed axis set; the weighted total is computed in
// code (scoring.ts) from these sub-scores, never trusted from the model.
// ===================================================================

const axisScoreJson = {
  type: "object",
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    evidence: { type: "string", maxLength: 1000 },
  },
  required: ["score", "evidence"],
} as const;

export const scoreSchema = {
  type: "object",
  properties: {
    skills_match: axisScoreJson,
    experience_relevance: axisScoreJson,
    seniority_fit: axisScoreJson,
    language_fit: axisScoreJson,
    recency_activity: axisScoreJson,
    nice_to_haves_covered: axisScoreJson,
    gaps: { type: "array", items: { type: "string", maxLength: 200 }, maxItems: 10 },
    risks: { type: "array", items: { type: "string", maxLength: 200 }, maxItems: 10 },
    confidence: { type: "number", minimum: 0, maximum: 1 },
  },
  required: [
    "skills_match",
    "experience_relevance",
    "seniority_fit",
    "language_fit",
    "recency_activity",
    "nice_to_haves_covered",
    "gaps",
    "risks",
    "confidence",
  ],
} as const;

const AxisScoreZod = z.object({
  score: z.number().min(0).max(100),
  evidence: z.string().max(1000),
});

export const ScoreResultZod = z.object({
  skills_match: AxisScoreZod,
  experience_relevance: AxisScoreZod,
  seniority_fit: AxisScoreZod,
  language_fit: AxisScoreZod,
  recency_activity: AxisScoreZod,
  nice_to_haves_covered: AxisScoreZod,
  gaps: z.array(z.string().min(1).max(200)).max(10),
  risks: z.array(z.string().min(1).max(200)).max(10),
  confidence: z.number().min(0).max(1),
});

// ===================================================================
// D — Verification (Pro/Flash). `verified` is re-derived in gate.ts; the
// model's own flag is accepted in the schema but never trusted.
// ===================================================================

export const verifySchema = {
  type: "object",
  properties: {
    requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          requirement_id: { type: "string" },
          confirmed: { type: "boolean" },
          note: { type: "string", maxLength: 500 },
        },
        required: ["requirement_id", "confirmed", "note"],
      },
    },
    verified: { type: "boolean" },
  },
  required: ["requirements", "verified"],
} as const;

export const VerifyResultZod = z.object({
  requirements: z.array(
    z.object({
      requirement_id: z.string().min(1),
      confirmed: z.boolean(),
      note: z.string().max(500),
    }),
  ),
  verified: z.boolean(),
});

export type ProfileExtractionRaw = z.infer<typeof ProfileExtractionZod>;
export type GateResultsRaw = z.infer<typeof GateResultsZod>;
export type ScoreResultRaw = z.infer<typeof ScoreResultZod>;
export type VerifyResultRaw = z.infer<typeof VerifyResultZod>;
