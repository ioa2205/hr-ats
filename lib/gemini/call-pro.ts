import { getGeminiClient, MODEL } from "./client";

interface ProCallOpts {
  systemInstruction: string;
  userPrompt: string;
  responseSchema: object;
  temperature?: number;
  maxOutputTokens?: number;
}

export interface ProCallResult {
  text: string;
  durationMs: number;
  promptTokens: number | null;
  outputTokens: number | null;
}

/**
 * Thin wrapper around Gemini 3.1 Pro with JSON-mode decoding. Returns the
 * raw JSON string + token counts (when present in the response). Callers
 * are responsible for Zod-parsing.
 */
export async function callGeminiProJson(opts: ProCallOpts): Promise<ProCallResult> {
  const ai = getGeminiClient();
  const start = Date.now();

  const result = await ai.models.generateContent({
    model: MODEL,
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
