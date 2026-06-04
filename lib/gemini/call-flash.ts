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
    },
  });

  const usage = result.usageMetadata as
    | { promptTokenCount?: number; candidatesTokenCount?: number }
    | undefined;

  return {
    text: result.text ?? "",
    durationMs: Date.now() - start,
    promptTokens: usage?.promptTokenCount ?? null,
    outputTokens: usage?.candidatesTokenCount ?? null,
  };
}
