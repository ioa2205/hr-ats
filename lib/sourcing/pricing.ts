/**
 * Gemini token pricing (USD per 1M tokens) for sourcing — duplicated here,
 * Deno-safe, so the funnel's import graph never pulls in lib/gemini/client
 * (which imports @google/genai + reads process.env and cannot be bundled into
 * the Deno edge worker).
 *
 * These MUST stay in sync with lib/gemini/client.ts. A Vitest drift test
 * (tests/unit/sourcing-cost.test.ts) asserts equality and fails loudly if the
 * canonical values change. Do not "fix" drift by editing only one side.
 */
export const PRO_INPUT_USD_PER_MTOK = 2.0;
export const PRO_OUTPUT_USD_PER_MTOK = 12.0;
export const FLASH_INPUT_USD_PER_MTOK = 0.15;
export const FLASH_OUTPUT_USD_PER_MTOK = 0.6;
