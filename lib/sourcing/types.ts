/**
 * Shared domain types for active (outbound) sourcing.
 *
 * Accuracy contract these types encode:
 *  - Every extracted fact carries provenance (the verbatim source span it came
 *    from) — see {@link ProvenancedField} / {@link NormalizedProfile}. The AI
 *    may only judge from text actually present in the fetched profile.
 *  - The hard-requirement gate is fail-closed: a candidate is shortlisted only
 *    with `meets_all_requirements === true` (every requirement satisfied with
 *    cited evidence at or above {@link MIN_REQUIREMENT_CONFIDENCE}) AND
 *    `verified === true` (an independent pass re-confirmed it).
 *
 * Runtime-agnostic: this module imports only types + zod-free standard JS, so
 * it can be unit-tested under Vitest and mirrored into the Deno edge worker.
 */
import type { Database } from "@/types/supabase";
import type { HardRequirement } from "@/types";

export type SourceKind = Database["public"]["Enums"]["source_kind"];
export type SourcingStatus = Database["public"]["Enums"]["sourcing_status"];

/**
 * Evidence below this confidence is treated as NOT met by the gate, even if the
 * model returned met:true. Fail-closed: when unsure, exclude.
 */
export const MIN_REQUIREMENT_CONFIDENCE = 0.7;

/** Shortlist size cap. Fewer is fine; we never pad past the gate. */
export const SHORTLIST_SIZE = 20;

// ===================================================================
// Provenance + normalized profile (what a connector emits, what the AI reads)
// ===================================================================

/** One atomic extracted fact tagged with the verbatim source span proving it. */
export interface ProvenancedField {
  /** machine label, e.g. "skill", "experience", "language", "education". */
  field: string;
  /** the normalized value. */
  value: string;
  /** verbatim excerpt from the raw source that evidences `value`. */
  evidence: string;
}

/** Contact info a source legitimately exposes. All optional. */
export interface SourcedContact {
  phone: string | null;
  email: string | null;
  telegram: string | null;
  profile_url: string | null;
}

/**
 * Canonical, normalized candidate profile WITH provenance. The serialized form
 * of this object is the `<source>` handed to every Gemini call — the AI may
 * quote evidence only from here.
 */
export interface NormalizedProfile {
  /** canonical full name; drives the identity key. */
  full_name: string;
  headline: string | null;
  location: string | null;
  /** atomic provenance-tagged facts; the structured evidence corpus. */
  fields: ProvenancedField[];
  /** the full verbatim raw source text (un-structured evidence corpus). */
  raw_text: string;
}

// ===================================================================
// Connector layer
// ===================================================================

/** Per-run budget caps. The funnel and each connector must respect these. */
export interface FetchBudget {
  /** hard cap on candidates pulled into the pool across all connectors. */
  maxFetched: number;
  /** hard cap on Gemini Pro calls (deep score + verify) per run. */
  maxProCalls: number;
  /** soft ceiling on total tokens; the funnel stops fetching past it. */
  tokenCeiling: number;
}

/**
 * One raw, normalized record from a source. Connectors ONLY fetch + normalize
 * (and attach provenance) — they never score or judge.
 */
export interface RawSourcedProfile {
  source: SourceKind;
  /** stable external id / url for the record within its source. */
  source_ref: string;
  profile: NormalizedProfile;
  contact: SourcedContact;
}

/**
 * A pluggable source. Each implementation owns its own auth, rate-limiting and
 * pagination and yields normalized records with provenance. Adding a source
 * must not touch the funnel.
 */
export interface SourceConnector {
  kind: SourceKind;
  /** are the credentials for this source present? */
  isConfigured(): boolean;
  fetch(profile: RequirementProfile, budget: FetchBudget): AsyncIterable<RawSourcedProfile>;
}

// ===================================================================
// Requirement profile (frozen at run start — Phase 1.3)
// ===================================================================

export interface WeightedItem {
  text: string;
  /** 1 (minor) .. 5 (critical). */
  weight: number;
}

export interface RequiredLanguage {
  language: "uz" | "ru" | "en";
  level: string;
}

/**
 * AI-extracted half of the requirement profile (Appendix A response). The gate
 * (hard_requirements) is deliberately NOT part of this — it is seeded
 * deterministically and never produced by the model.
 */
export interface RequirementProfileExtraction {
  must_haves: WeightedItem[];
  nice_to_haves: WeightedItem[];
  seniority: string | null;
  required_languages: RequiredLanguage[];
  search_keywords: string[];
}

/**
 * The frozen profile that drives a whole run. Deterministic seed
 * (hard_requirements / title / location / required_skills) merged with the
 * AI extraction.
 */
export interface RequirementProfile extends RequirementProfileExtraction {
  /** the NON-NEGOTIABLE gate, copied verbatim from the posting. */
  hard_requirements: HardRequirement[];
  title: string;
  location: string | null;
  required_skills: string[];
}

// ===================================================================
// Funnel judgements
// ===================================================================

/** Gate verdict for one requirement (Appendix B). */
export interface RequirementResult {
  requirement_id: string;
  met: boolean;
  /** verbatim quote from the source; empty ⇒ cannot be a pass. */
  evidence: string;
  /** 0..1. */
  confidence: number;
}

export interface GateOutcome {
  meets_all_requirements: boolean;
  results: RequirementResult[];
}

/** One scoring axis (Appendix C). */
export interface ScoreAxis {
  axis: string;
  /** 0..100. */
  score: number;
  evidence: string;
}

export interface DeepScore {
  /** weighted total 0..100. */
  total: number;
  axes: ScoreAxis[];
  gaps: string[];
  risks: string[];
  confidence: number;
}

/** Independent verification of one requirement (Appendix D). */
export interface RequirementVerification {
  requirement_id: string;
  confirmed: boolean;
  note: string;
}

export interface VerificationOutcome {
  verified: boolean;
  results: RequirementVerification[];
}

// ===================================================================
// Stage counters persisted to sourcing_searches.stats
// ===================================================================

export interface SourcingStats {
  fetched: number;
  deduped: number;
  gate_passed: number;
  scored: number;
  verified: number;
  shortlisted: number;
  /** per-source fetched counts, keyed by SourceKind. */
  per_source: Partial<Record<SourceKind, number>>;
  /** sources that degraded (errored) mid-run ⇒ run completes as `partial`. */
  degraded_sources: SourceKind[];
}

export function emptyStats(): SourcingStats {
  return {
    fetched: 0,
    deduped: 0,
    gate_passed: 0,
    scored: 0,
    verified: 0,
    shortlisted: 0,
    per_source: {},
    degraded_sources: [],
  };
}
