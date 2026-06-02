/**
 * Shared JSON→Zod parsing for Gemini output. The wrappers return a raw string
 * and never validate; every caller must JSON.parse in a guard then Zod-validate,
 * surfacing distinct codes (invalid_json vs schema_mismatch). This mirrors the
 * interview-questions / ai-draft convention. Fail-closed: on any parse failure
 * the funnel drops the candidate rather than guessing.
 */
import type { z } from "zod/v4";

export class SourcingParseError extends Error {
  readonly code: "invalid_json" | "schema_mismatch";
  constructor(code: "invalid_json" | "schema_mismatch", message: string) {
    super(message);
    this.code = code;
    this.name = "SourcingParseError";
  }
}

export function parseGeminiJson<T>(rawJson: string, schema: z.ZodType<T>, label: string): T {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw new SourcingParseError("invalid_json", `${label}: response was not valid JSON`);
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    throw new SourcingParseError("schema_mismatch", `${label}: response did not match schema`);
  }
  return result.data;
}
