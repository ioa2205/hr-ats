import { ThinkingLevel } from "@google/genai";
import { getGeminiClient, MODEL_FLASH } from "./client";

interface FlashCallOpts {
  systemInstruction: string;
  userPrompt: string;
  responseSchema: object;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface FlashCallResult {
  text: string;
  durationMs: number;
  promptTokens: number | null;
  outputTokens: number | null;
}

/**
 * Thin wrapper around Gemini 3 Flash with JSON-mode decoding. Returns the raw
 * JSON string + token counts (when the API reports them); callers Zod-parse.
 */
export async function callGeminiFlashJson(opts: FlashCallOpts): Promise<FlashCallResult> {
  const ai = getGeminiClient();
  const start = Date.now();

  const result = await ai.models.generateContent({
    model: MODEL_FLASH,
    contents: [{ role: "user", parts: [{ text: opts.userPrompt }] }],
    config: {
      systemInstruction: opts.systemInstruction,
      responseMimeType: "application/json",
      responseSchema: opts.responseSchema,
      temperature: opts.temperature ?? 0.3,
      maxOutputTokens: opts.maxOutputTokens ?? 4096,
      // Gemini 3 enables an "automatic" thinking budget by default; left unset,
      // a heavier prompt can spend the whole maxOutputTokens on thinking and
      // return EMPTY text — which the callers then mis-report as "invalid JSON".
      // Pin LOW (matches the proven process-cv path): fast, deterministic, and
      // leaves the token budget for the actual JSON answer.
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const usage = result.usageMetadata as
    | { promptTokenCount?: number; candidatesTokenCount?: number }
    | undefined;

  const text = result.text ?? "";
  if (text.trim().length === 0) {
    // No usable output (e.g. safety block or a token-budget exhaustion). Surface
    // a precise reason instead of letting JSON.parse throw a misleading error.
    const finishReason = result.candidates?.[0]?.finishReason ?? "unknown";
    throw new Error(`gemini_empty_response: finishReason=${finishReason}`);
  }

  return {
    text,
    durationMs: Date.now() - start,
    promptTokens: usage?.promptTokenCount ?? null,
    outputTokens: usage?.candidatesTokenCount ?? null,
  };
}
