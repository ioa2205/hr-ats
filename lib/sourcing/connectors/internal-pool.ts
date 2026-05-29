/**
 * internal_pool connector (Phase 1.2 — the only Phase 1 source).
 *
 * Sources the company's OWN past candidates (its data) who are not already
 * applicants to the target posting, and normalizes each into a provenance-
 * tagged profile. Connectors ONLY fetch + normalize — never score or judge.
 *
 * Provenance discipline: the only citable text we emit is what is actually
 * recorded. Highest-trust evidence is the candidate's self-declared answers to
 * past requirement questions (requirements_responses paired with the snapshot
 * labels). Prior screening insights (summary / strengths) are included but
 * explicitly labeled `prior_screening_*` so HR — and the verifier — can see
 * they are secondary. We never synthesize facts that aren't in the row.
 *
 * The DB query is injected (LoadPoolCandidates) so this module stays pure and
 * runs unchanged in Node (tests / Next) and in the Deno worker.
 */
import type { HardRequirement } from "@/types";
import type {
  NormalizedProfile,
  ProvenancedField,
  RawSourcedProfile,
  SourceConnector,
  SourcedContact,
} from "../types";

/** The subset of a candidates row the connector reads. */
export interface PoolCandidateRow {
  id: string;
  full_name: string;
  phone_number: string;
  language_detected: string | null;
  requirements_snapshot: HardRequirement[] | null;
  requirements_responses: Record<string, string> | null;
  strengths: string[] | null;
  one_line_summary: string | null;
}

export type LoadPoolCandidates = (limit: number) => Promise<PoolCandidateRow[]>;

function selfDeclaredFields(row: PoolCandidateRow): ProvenancedField[] {
  const responses = row.requirements_responses;
  if (!responses || typeof responses !== "object") return [];
  const labelById = new Map<string, string>();
  if (Array.isArray(row.requirements_snapshot)) {
    for (const req of row.requirements_snapshot) {
      if (req && typeof req.id === "string") {
        labelById.set(req.id, req.label_ru || req.label_uz || req.id);
      }
    }
  }
  const fields: ProvenancedField[] = [];
  for (const [reqId, answer] of Object.entries(responses)) {
    if (typeof answer !== "string" || answer.trim().length === 0) continue;
    const label = labelById.get(reqId) ?? reqId;
    const text = `${label}: ${answer}`;
    fields.push({ field: "self_declared", value: text, evidence: text });
  }
  return fields;
}

function priorScreeningFields(row: PoolCandidateRow): ProvenancedField[] {
  const fields: ProvenancedField[] = [];
  if (row.one_line_summary && row.one_line_summary.trim().length > 0) {
    fields.push({
      field: "prior_screening_summary",
      value: row.one_line_summary,
      evidence: row.one_line_summary,
    });
  }
  if (Array.isArray(row.strengths)) {
    for (const strength of row.strengths) {
      if (typeof strength === "string" && strength.trim().length > 0) {
        fields.push({ field: "prior_screening_strength", value: strength, evidence: strength });
      }
    }
  }
  return fields;
}

function buildRawText(row: PoolCandidateRow, fields: ProvenancedField[]): string {
  const lines: string[] = [`Name: ${row.full_name}`];
  if (row.language_detected) lines.push(`Detected CV language: ${row.language_detected}`);
  const selfDeclared = fields.filter((f) => f.field === "self_declared");
  if (selfDeclared.length > 0) {
    lines.push("Self-declared answers to prior requirement questions:");
    for (const field of selfDeclared) lines.push(`- ${field.value}`);
  }
  const summary = fields.find((f) => f.field === "prior_screening_summary");
  if (summary) lines.push(`Prior screening summary: ${summary.value}`);
  const strengths = fields.filter((f) => f.field === "prior_screening_strength");
  if (strengths.length > 0) {
    lines.push("Prior screening strengths:");
    for (const field of strengths) lines.push(`- ${field.value}`);
  }
  return lines.join("\n");
}

/** Pure normalization of one past candidate into a provenance-tagged record. */
export function normalizePoolCandidate(row: PoolCandidateRow): RawSourcedProfile {
  const fields: ProvenancedField[] = [];
  if (row.language_detected) {
    fields.push({
      field: "language",
      value: row.language_detected,
      evidence: `Detected CV language: ${row.language_detected}`,
    });
  }
  fields.push(...selfDeclaredFields(row));
  fields.push(...priorScreeningFields(row));

  const profile: NormalizedProfile = {
    full_name: row.full_name,
    headline: row.one_line_summary ?? null,
    location: null,
    fields,
    raw_text: buildRawText(row, fields),
  };

  const contact: SourcedContact = {
    phone: row.phone_number,
    email: null,
    telegram: null,
    profile_url: null,
  };

  return { source: "internal_pool", source_ref: row.id, profile, contact };
}

/**
 * Build the connector. `load` is bound by the caller to a company + target
 * posting (it must already exclude applicants to the target posting). Always
 * configured — it's the company's own data.
 */
export function createInternalPoolConnector(load: LoadPoolCandidates): SourceConnector {
  return {
    kind: "internal_pool",
    isConfigured: () => true,
    async *fetch(_profile, budget) {
      const rows = await load(budget.maxFetched);
      let emitted = 0;
      for (const row of rows) {
        if (emitted >= budget.maxFetched) break;
        yield normalizePoolCandidate(row);
        emitted += 1;
      }
    },
  };
}
