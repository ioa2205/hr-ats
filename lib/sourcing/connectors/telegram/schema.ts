/**
 * Zod schemas for the Telegram sourcing connector.
 *
 * Same discipline as the hh connector: validate the ENVELOPE strictly so a
 * broken reader payload fails loudly (never silently yields zero candidates),
 * but keep the AI classify/extract RESULT tolerant — every extracted field is
 * shaped but generous, and on any parse/schema failure the caller drops the
 * single item (fail-closed) rather than crashing the run.
 *
 * A {@link RawMessage} is the connector's own normalized view of one channel
 * post — the {@link import("./reader").TelegramReader} produces it (from GramJS
 * in prod, from fakes in tests), so the pure pipeline never touches the live
 * client.
 */
import { z } from "zod/v4";

// ===================================================================
// Reader envelope (strict) — one post from an allow-listed channel.
// ===================================================================

/**
 * One Telegram message as the reader hands it to the pipeline. Strict: an
 * unexpected/missing field is a reader bug we want surfaced, not swallowed.
 * `posted_at` is an ISO-8601 timestamp; `url` is the public t.me permalink when
 * the channel is public, else null.
 */
export const RawMessageSchema = z
  .object({
    /** channel handle the post came from, without a leading '@' (e.g. "ish_uz"). */
    channel: z.string().min(1),
    /** telegram message id within the channel. */
    message_id: z.number().int().nonnegative(),
    /** ISO-8601 timestamp the message was posted. */
    posted_at: z.string().min(1),
    /** the message body (may be empty for media-only posts). */
    text: z.string(),
    /** public permalink (https://t.me/<channel>/<id>) or null for private channels. */
    url: z.string().nullable(),
  })
  .strict();
export type RawMessage = z.infer<typeof RawMessageSchema>;

// ===================================================================
// AI classify + extract result (tolerant) — Gemini Flash, JSON mode.
// ===================================================================

/** A machine-labelled fact with the verbatim source span proving it. */
const extractedFieldJson = {
  type: "object",
  properties: {
    field: { type: "string", maxLength: 40 },
    value: { type: "string", maxLength: 400 },
    // verbatim quote from the message; "" means "no quotable evidence".
    evidence: { type: "string", maxLength: 600 },
  },
  required: ["field", "value", "evidence"],
} as const;

/**
 * The structured-output contract handed to Gemini's `responseSchema`. The model
 * classifies the message and, ONLY for a candidate self-presenting as a job
 * seeker, extracts provenance-tagged facts. A recruiter posting a job is
 * `vacancy`; promo is `ad`; everything else `other` — all dropped downstream.
 */
export const telegramExtractionSchema = {
  type: "object",
  properties: {
    classification: {
      type: "string",
      enum: ["candidate_cv", "vacancy", "ad", "other"],
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    // Does the message itself signal the author is seeking work right now?
    actively_looking: { type: "boolean" },
    // Each fact carries verbatim evidence; full_name/headline/location are
    // emitted as fields with the labels "name"/"headline"/"location".
    fields: { type: "array", items: extractedFieldJson, maxItems: 50 },
  },
  required: ["classification", "confidence", "actively_looking", "fields"],
} as const;

const ExtractedFieldZod = z.object({
  field: z.string().min(1).max(40),
  value: z.string().min(1).max(400),
  evidence: z.string().max(600),
});
export type ExtractedField = z.infer<typeof ExtractedFieldZod>;

export const TelegramExtractionZod = z.object({
  classification: z.enum(["candidate_cv", "vacancy", "ad", "other"]),
  confidence: z.number().min(0).max(1),
  actively_looking: z.boolean(),
  fields: z.array(ExtractedFieldZod).max(50),
});
export type TelegramExtraction = z.infer<typeof TelegramExtractionZod>;
