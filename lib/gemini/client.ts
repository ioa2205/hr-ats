import { GoogleGenAI } from "@google/genai";

let instance: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI {
  if (!instance) {
    instance = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GEMINI_API_KEY!,
    });
  }
  return instance;
}

/** Singleton re-export for convenience. */
export const ai = getGeminiClient;

export const MODEL = "gemini-3.1-pro-preview";

/**
 * Faster/cheaper model for non-critical generation tasks (job-posting drafting,
 * translation). Higher-stakes scoring still goes through `MODEL` (Pro).
 */
export const MODEL_FLASH = "gemini-3-flash-preview";

/** Cost per 1 million tokens (USD, April 2026 pricing). */
export const INPUT_USD_PER_MTOK = 2.0;
export const OUTPUT_USD_PER_MTOK = 12.0;

/** Gemini 3 Flash pricing (USD per 1M tokens, 2026). ~4x cheaper than Pro. */
export const INPUT_USD_PER_MTOK_FLASH = 0.5;
export const OUTPUT_USD_PER_MTOK_FLASH = 3.0;
