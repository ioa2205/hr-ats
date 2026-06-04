/**
 * redactSecrets — strip credential-shaped tokens from a string before it is
 * persisted to a tenant- or user-visible field, written to an operator-readable
 * diagnostic column, logged, or returned in an API body.
 *
 * Why this exists: provider SDKs echo the API key in their error text. Google's
 * 403 reads `Permission denied: Consumer 'api_key:AIza...' has been suspended.`
 * That message was being stored verbatim in `candidates.ai_error` and rendered
 * in the HR UI, leaking the platform's Gemini key to every viewer. This helper
 * is the chokepoint that closes that class of leak.
 *
 * Conservative by design: it redacts the credential VALUE and leaves the
 * surrounding diagnostic text intact, so the message stays useful for debugging.
 *
 * Mirrored inline in supabase/functions/process-cv/index.ts (the Deno Edge
 * Function can't import the Next.js module graph) — keep the two in sync.
 */
const REDACTIONS: ReadonlyArray<readonly [RegExp, string]> = [
  // Google API keys: `AIza` + url-safe chars. The leak that started this.
  [/AIza[0-9A-Za-z_-]{10,}/g, "[redacted-key]"],
  // OpenAI / Anthropic / Stripe style prefixed secret keys.
  [/\b(?:sk|pk|rk)-[A-Za-z0-9_-]{16,}/g, "[redacted-key]"],
  // JWTs (three base64url segments) — e.g. a Supabase service-role key.
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, "[redacted-jwt]"],
  // Bearer tokens echoed back from request headers.
  [/(bearer\s+)[A-Za-z0-9._-]{12,}/gi, "$1[redacted]"],
  // Generic `api_key: <value>` / `apikey=<value>` / `secret "<value>"` echoes
  // that didn't match a known prefix above — keep the label, strip the value.
  [
    /((?:api[_-]?key|apikey|access[_-]?token|secret)["'\s:=]{1,4})[A-Za-z0-9._-]{8,}/gi,
    "$1[redacted]",
  ],
];

export function redactSecrets(text: string | null | undefined): string {
  if (!text) return "";
  let out = String(text);
  for (const [pattern, replacement] of REDACTIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}
