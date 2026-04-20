import { INPUT_USD_PER_MTOK, OUTPUT_USD_PER_MTOK } from "./client";

/** Calculate USD cost from token counts using current pricing. */
export function calcCost(promptTokens: number, outputTokens: number): number {
  return (promptTokens * INPUT_USD_PER_MTOK + outputTokens * OUTPUT_USD_PER_MTOK) / 1_000_000;
}
