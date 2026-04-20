import { getGeminiClient, MODEL_FLASH } from "./client";

interface FlashCallOpts {
  systemInstruction: string;
  userPrompt: string;
  responseSchema: object;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * Thin wrapper around Gemini 3 Flash with JSON-mode decoding. Returns the
 * raw JSON string; callers are responsible for Zod-parsing.
 */
export async function callGeminiFlashJson(opts: FlashCallOpts): Promise<{
  text: string;
  durationMs: number;
}> {
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

  const text = result.text ?? "";
  return { text, durationMs: Date.now() - start };
}
