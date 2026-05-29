/**
 * Wires the funnel's Gemini dependencies to the real lib/gemini wrappers
 * (two-tier split: Flash for the bulk gate, Pro for extraction / deep score /
 * verification). Each method calls the model, then JSON-parses + Zod-validates
 * via parseGeminiJson, surfacing invalid_json / schema_mismatch. Flash returns
 * no token counts, so the gate reports null usage (cost.ts adds zero, never
 * inventing Flash tokens).
 *
 * Server-only: imports lib/gemini/* which read process.env and pull in
 * @google/genai. Used by the Next.js background worker route.
 */
import { callGeminiProJson } from "@/lib/gemini/call-pro";
import { callGeminiFlashJson } from "@/lib/gemini/call-flash";
import { parseGeminiJson } from "./parse";
import {
  GateResultsZod,
  ProfileExtractionZod,
  ScoreResultZod,
  VerifyResultZod,
  gateSchema,
  profileExtractionSchema,
  scoreSchema,
  verifySchema,
} from "./schema";
import {
  GATE_SYSTEM,
  PROFILE_EXTRACTION_SYSTEM,
  SCORE_SYSTEM,
  VERIFY_SYSTEM,
  buildGateUserPrompt,
  buildProfileExtractionUserPrompt,
  buildScoreUserPrompt,
  buildVerifyUserPrompt,
  serializeSource,
} from "./prompts";
import type { FunnelDeps, GeminiCallResult } from "./funnel";
import type { PostingSeed } from "./requirement-profile";
import type {
  NormalizedProfile,
  RequirementProfile,
  RequirementProfileExtraction,
  RequirementResult,
} from "./types";
import type { HardRequirement } from "@/types";
import type {
  GateResultsRaw,
  ScoreResultRaw,
  VerifyResultRaw,
} from "./schema";

type GeminiFunnelMethods = Pick<
  FunnelDeps,
  "extractProfile" | "runGate" | "runScore" | "runVerify"
>;

export function createGeminiFunnelMethods(): GeminiFunnelMethods {
  return {
    async extractProfile(
      posting: PostingSeed,
    ): Promise<GeminiCallResult<RequirementProfileExtraction>> {
      const { text, promptTokens, outputTokens } = await callGeminiProJson({
        systemInstruction: PROFILE_EXTRACTION_SYSTEM,
        userPrompt: buildProfileExtractionUserPrompt({
          title: posting.title,
          description: posting.description,
          requiredSkills: posting.required_skills,
          hardRequirements: posting.hard_requirements,
        }),
        responseSchema: profileExtractionSchema,
      });
      const data = parseGeminiJson(text, ProfileExtractionZod, "profile_extraction");
      return { data, usage: { promptTokens, outputTokens } };
    },

    async runGate(
      source: NormalizedProfile,
      requirements: HardRequirement[],
    ): Promise<GeminiCallResult<GateResultsRaw>> {
      const { text } = await callGeminiFlashJson({
        systemInstruction: GATE_SYSTEM,
        userPrompt: buildGateUserPrompt(serializeSource(source), requirements),
        responseSchema: gateSchema,
      });
      const data = parseGeminiJson(text, GateResultsZod, "gate");
      return { data, usage: { promptTokens: null, outputTokens: null } };
    },

    async runScore(
      source: NormalizedProfile,
      profile: RequirementProfile,
    ): Promise<GeminiCallResult<ScoreResultRaw>> {
      const { text, promptTokens, outputTokens } = await callGeminiProJson({
        systemInstruction: SCORE_SYSTEM,
        userPrompt: buildScoreUserPrompt(serializeSource(source), profile),
        responseSchema: scoreSchema,
      });
      const data = parseGeminiJson(text, ScoreResultZod, "score");
      return { data, usage: { promptTokens, outputTokens } };
    },

    async runVerify(
      source: NormalizedProfile,
      requirements: HardRequirement[],
      prior: RequirementResult[],
    ): Promise<GeminiCallResult<VerifyResultRaw>> {
      const { text, promptTokens, outputTokens } = await callGeminiProJson({
        systemInstruction: VERIFY_SYSTEM,
        userPrompt: buildVerifyUserPrompt(
          serializeSource(source),
          requirements,
          prior.map((p) => ({ requirement_id: p.requirement_id, met: p.met, evidence: p.evidence })),
        ),
        responseSchema: verifySchema,
      });
      const data = parseGeminiJson(text, VerifyResultZod, "verify");
      return { data, usage: { promptTokens, outputTokens } };
    },
  };
}
