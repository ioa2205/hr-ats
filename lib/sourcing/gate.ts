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
 */
export function evaluateGate(
  hardRequirements: HardRequirement[],
  modelResults: RequirementResult[],
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
    const met =
      verdict?.met === true && evidence.length > 0 && confidence >= MIN_REQUIREMENT_CONFIDENCE;
    return { requirement_id: req.id, met, evidence, confidence };
  });

  return { meets_all_requirements: results.every((result) => result.met), results };
}

/**
 * Final independent verification (Appendix D). `verified` is true ONLY if the
 * gate already passed AND every hard requirement was re-confirmed. The model's
 * own `verified` flag is never trusted — we re-derive it. Default to not-confirmed.
 */
export function evaluateVerification(
  hardRequirements: HardRequirement[],
  gate: GateOutcome,
  modelVerifications: RequirementVerification[],
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

  const verified =
    gate.meets_all_requirements && results.every((result) => result.confirmed);
  return { verified, results };
}
