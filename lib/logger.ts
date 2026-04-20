import pino from "pino";

// P2-17: redact PII. The path list covers both top-level and one-level-nested
// fields that app code commonly logs; Pino's redact syntax supports wildcard
// `*` for a single path segment. Nothing beyond two levels is in our logging
// surface, so deeper wildcards aren't needed.
//
// Allowlist (things it IS safe to log, enumerated in HARDENING_NOTES §P2-17):
//   user id, company id, candidate id, job id, locale, method+path, status,
//   request id, error class/message, Gemini model name, token counts.
// Everything else that looks sensitive should be on this list.
const REDACT_PATHS = [
  "email",
  "phone",
  "phone_number",
  "password",
  "cv_text",
  "turnstile_token",
  "authorization",
  "cookie",
  "*.email",
  "*.phone",
  "*.phone_number",
  "*.password",
  "*.cv_text",
  "*.turnstile_token",
  "*.authorization",
  "*.cookie",
  "headers.authorization",
  "headers.cookie",
  "req.body",
  "res.body",
  "request.body",
];

export const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
  ...(process.env.NODE_ENV !== "production" && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
      },
    },
  }),
});
