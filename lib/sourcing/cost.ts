/**
 * Model-aware token-cost accounting for sourcing runs.
 *
 * Why this exists separately from lib/gemini/cost.ts: that helper hardcodes Pro
 * pricing (calcCost takes no model arg), so a Flash-heavy funnel would be
 * over-priced ~13x. Sourcing mixes Flash (bulk gate) and Pro (deep judgement),
 * so cost must be tier-aware.
 *
 * Honesty note: Gemini Flash does not return token counts via usageMetadata
 * (only Pro does). When a usage value is null we add 0 tokens / 0 cost for that
 * call — i.e. we record what the API actually measured (Pro), never an
 * invented Flash estimate. The funnel's Pro calls (deep score + verify) are the
 * dominant cost, so the recorded total tracks real spend closely.
 */
import {
  INPUT_USD_PER_MTOK,
  OUTPUT_USD_PER_MTOK,
  INPUT_USD_PER_MTOK_FLASH,
  OUTPUT_USD_PER_MTOK_FLASH,
} from "@/lib/gemini/client";

export type GeminiTier = "pro" | "flash";

export interface TokenUsage {
  promptTokens: number | null;
  outputTokens: number | null;
}

export interface RunCost {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export const ZERO_COST: RunCost = { inputTokens: 0, outputTokens: 0, costUsd: 0 };

/** USD cost for one call's token counts at the given tier's pricing. */
export function calcCostForTier(
  tier: GeminiTier,
  promptTokens: number,
  outputTokens: number,
): number {
  const inputRate = tier === "pro" ? INPUT_USD_PER_MTOK : INPUT_USD_PER_MTOK_FLASH;
  const outputRate = tier === "pro" ? OUTPUT_USD_PER_MTOK : OUTPUT_USD_PER_MTOK_FLASH;
  return (promptTokens * inputRate + outputTokens * outputRate) / 1_000_000;
}

/** Fold one call's measured usage into a running total. Nulls contribute 0. */
export function addUsage(acc: RunCost, tier: GeminiTier, usage: TokenUsage): RunCost {
  const prompt = usage.promptTokens ?? 0;
  const output = usage.outputTokens ?? 0;
  return {
    inputTokens: acc.inputTokens + prompt,
    outputTokens: acc.outputTokens + output,
    costUsd: acc.costUsd + calcCostForTier(tier, prompt, output),
  };
}
