/**
 * The fail-closed hard-requirement gate (Phase 1.4 stage 3) and the final
 * verification check (stage 5). These are the structural enforcers of the
 * product guarantee — "everyone shown meets every requirement" — and they do
 * NOT trust the model's claims blindly.
 *
 * A requirement passes the gate ONLY if the model returned a matching verdict
 * with met===true, NON-EMPTY evidence, AND confidence at or above
 * MIN_REQUIREMENT_CONFIDENCE. Missing verdict, empty/whitespace evidence, low
 * or malformed confidence, or anything ambiguous ⇒ NOT met. This re-derivation
 * is what makes missing/ambiguous evidence count as a fail by construction.
 */
import type { HardRequirement } from "@/types";
import {
  MIN_REQUIREMENT_CONFIDENCE,
  type GateOutcome,
  type RequirementResult,
  type RequirementVerification,
  type VerificationOutcome,
} from "./types";

function clampConfidence(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 0;
}

/**
 * Authoritative gate. `modelResults` are the raw per-requirement verdicts from
 * the Flash auditor (Appendix B); this re-applies the fail-closed rules on top.
 * Empty hard_requirements ⇒ vacuously meets_all (nothing to fail).
 *
 * `minConfidence` is the strictness-mode floor: a requirement only counts as met
 * at or above it. It defaults to MIN_REQUIREMENT_CONFIDENCE (strict). The caller
 * decides how many misses to tolerate via `missed_count` — this function reports
 * the misses without imposing a tolerance itself.
 */
export function evaluateGate(
  hardRequirements: HardRequirement[],
  modelResults: RequirementResult[],
  minConfidence: number = MIN_REQUIREMENT_CONFIDENCE,
): GateOutcome {
  const byId = new Map<string, RequirementResult>();
  for (const result of modelResults) {
    // first verdict per id wins; later duplicates ignored (deterministic).
    if (result && typeof result.requirement_id === "string" && !byId.has(result.requirement_id)) {
      byId.set(result.requirement_id, result);
    }
  }

  const results: RequirementResult[] = hardRequirements.map((req) => {
    const verdict = byId.get(req.id);
    const evidence = typeof verdict?.evidence === "string" ? verdict.evidence.trim() : "";
    const confidence = clampConfidence(verdict?.confidence);
    const met = verdict?.met === true && evidence.length > 0 && confidence >= minConfidence;
    return { requirement_id: req.id, met, evidence, confidence };
  });

  const missed = results.filter((result) => !result.met);
  return {
    meets_all_requirements: missed.length === 0,
    missed_count: missed.length,
    missed_requirement_ids: missed.map((result) => result.requirement_id),
    results,
  };
}

/**
 * Final independent verification (Appendix D). The model's own `verified` flag is
 * never trusted — we re-derive it. Default to not-confirmed.
 *
 * `verified` is true ONLY if the candidate passed the (tolerated) gate AND every
 * requirement that the gate marked MET was independently re-confirmed.
 * `requiredIds` lets a near-miss candidate be verified on its met requirements
 * alone — the requirements it was already flagged as missing are not re-checked
 * here. When omitted, ALL hard requirements must re-confirm (the strict default).
 */
export function evaluateVerification(
  hardRequirements: HardRequirement[],
  gate: { meets_all_requirements: boolean; results: RequirementResult[] },
  modelVerifications: RequirementVerification[],
  requiredIds?: ReadonlySet<string>,
): VerificationOutcome {
  const byId = new Map<string, RequirementVerification>();
  for (const verification of modelVerifications) {
    if (
      verification &&
      typeof verification.requirement_id === "string" &&
      !byId.has(verification.requirement_id)
    ) {
      byId.set(verification.requirement_id, verification);
    }
  }

  const results: RequirementVerification[] = hardRequirements.map((req) => {
    const verification = byId.get(req.id);
    return {
      requirement_id: req.id,
      confirmed: verification?.confirmed === true,
      note: typeof verification?.note === "string" ? verification.note : "",
    };
  });

  // Which requirements must re-confirm. Strict default = all of them; a near-miss
  // caller passes only the ids the gate actually marked met.
  const mustConfirm = requiredIds ?? new Set(hardRequirements.map((req) => req.id));
  // `meets_all_requirements` here means "passed the gate within tolerance" — the
  // funnel sets it true for every candidate that survived stage 3.
  const verified =
    gate.meets_all_requirements &&
    results.filter((result) => mustConfirm.has(result.requirement_id)).every((r) => r.confirmed);
  return { verified, results };
}
