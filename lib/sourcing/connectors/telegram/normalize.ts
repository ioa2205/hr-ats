/**
 * Pure normalization of one classified Telegram message into a provenance-
 * tagged {@link RawSourcedProfile}. Same discipline as the hh / internal-pool
 * normalizers: connectors ONLY fetch + normalize, never judge.
 *
 * Provenance: every extracted fact comes from the AI's `fields[]`, each carrying
 * a verbatim quote from the post; we never synthesize a fact the message did not
 * state. The verbatim post body is the `raw_text` corpus the funnel's gate will
 * quote from. The only non-quote field is `posted_at` — honest Telegram message
 * metadata (its evidence is the timestamp itself), exposed so recency can rank.
 */
import type {
  NormalizedProfile,
  ProvenancedField,
  RawSourcedProfile,
  SourcedContact,
} from "../../types";
import type { RawMessage, TelegramExtraction } from "./schema";
import type { ExtractedContact } from "./classify";
import { ageInDays, findActivePhrase } from "./recency";

/** Read a value from the EVIDENCE-BACKED fields only (never from a dropped one). */
function fieldValue(fields: ProvenancedField[], label: string): string | null {
  const found = fields.find((f) => f.field === label && f.value.trim().length > 0);
  return found ? found.value.trim() : null;
}

/** Human-readable name for the card: name → headline → handle → message ref. */
function deriveName(
  message: RawMessage,
  fields: ProvenancedField[],
  contact: ExtractedContact,
): string {
  return (
    fieldValue(fields, "name") ??
    fieldValue(fields, "headline") ??
    contact.username ??
    `Telegram ${message.channel} #${message.message_id}`
  );
}

function recencyLabel(message: RawMessage, nowMs: number): string {
  const age = ageInDays(message.posted_at, nowMs);
  if (age === null) return `Posted ${message.posted_at}`;
  if (age <= 0) return "Active today";
  if (age === 1) return "Active 1 day ago";
  return `Active ${age} days ago`;
}

function buildRawText(
  message: RawMessage,
  name: string,
  contact: ExtractedContact,
  nowMs: number,
): string {
  const lines: string[] = [`Name: ${name}`];
  lines.push(`Source: Telegram channel @${message.channel}`);
  lines.push(recencyLabel(message, nowMs));
  if (contact.username) lines.push(`Contact: ${contact.username}`);
  if (contact.phone) lines.push(`Phone: ${contact.phone}`);
  if (contact.email) lines.push(`Email: ${contact.email}`);
  lines.push("Original post:");
  lines.push(message.text);
  return lines.join("\n");
}

/**
 * Normalize one candidate_cv message + its AI extraction into a provenance-
 * tagged record. The caller has already classified it candidate_cv and resolved
 * its contact handle in the pre-filter.
 */
export function normalizeTelegramMessage(
  message: RawMessage,
  extraction: TelegramExtraction,
  contact: ExtractedContact,
  nowMs: number,
): RawSourcedProfile {
  // Carry every AI-extracted fact verbatim (each already has its evidence span).
  const fields: ProvenancedField[] = extraction.fields
    .filter((f) => f.value.trim().length > 0 && f.evidence.trim().length > 0)
    .map((f) => ({ field: f.field, value: f.value.trim(), evidence: f.evidence.trim() }));

  // Active-intent: only claimed when we can quote it verbatim from the post.
  const activePhrase = findActivePhrase(message.text);
  if (activePhrase) {
    fields.push({ field: "actively_looking", value: "yes", evidence: activePhrase });
  }

  // Recency as a ranking input. Evidence is the Telegram message timestamp
  // (metadata), not a body quote — labelled honestly as such.
  fields.push({
    field: "posted_at",
    value: message.posted_at,
    evidence: `${recencyLabel(message, nowMs)} (Telegram message timestamp ${message.posted_at})`,
  });

  const name = deriveName(message, fields, contact);
  const headline = fieldValue(fields, "headline");
  const location = fieldValue(fields, "location");

  const profile: NormalizedProfile = {
    full_name: name,
    headline,
    location,
    fields,
    raw_text: buildRawText(message, name, contact, nowMs),
  };

  const sourcedContact: SourcedContact = {
    phone: contact.phone,
    email: contact.email,
    telegram: contact.username,
    profile_url: contact.profile_url ?? message.url,
  };

  return {
    source: "telegram",
    source_ref: `telegram:${message.channel}:${message.message_id}`,
    profile,
    contact: sourcedContact,
  };
}
