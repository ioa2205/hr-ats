import type { HardRequirement } from "@/types";

/**
 * Pure evaluator for the candidate's answers against a job's hard requirements.
 *
 * IMPORTANT: this never throws and never blocks submission. We always return a
 * shape that lets the caller record what the candidate answered. Whether to act
 * on `meetsAll` (skip AI, flag in HR view, etc.) is the caller's decision.
 *
 * Used by both the apply route (server-side authority) and the candidate form
 * (preview + storage of normalised answers). Keep it framework-free.
 */
export interface RequirementEvaluation {
  /** Normalised map: req.id -> the candidate's raw answer string. */
  responses: Record<string, string>;
  /** false when at least one requirement was missed; true when all met (or when there are zero requirements). */
  meetsAll: boolean;
  /** Subset of requirement IDs that were not satisfied. Empty when meetsAll=true. */
  mismatchedIds: string[];
}

export function evaluateRequirements(
  requirements: HardRequirement[],
  answers: Record<string, unknown> | null | undefined,
): RequirementEvaluation {
  const responses: Record<string, string> = {};
  const mismatchedIds: string[] = [];

  for (const req of requirements) {
    const raw = answers?.[req.id];
    const val = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
    responses[req.id] = val;

    if (!isRequirementMet(req, val)) {
      mismatchedIds.push(req.id);
    }
  }

  return {
    responses,
    meetsAll: mismatchedIds.length === 0,
    mismatchedIds,
  };
}

export function isRequirementMet(req: HardRequirement, value: string): boolean {
  if (req.type === "boolean") {
    return value === "true";
  }
  if (req.type === "number") {
    if (!value) return false;
    const num = Number(value);
    if (Number.isNaN(num)) return false;
    if (req.min_value !== null && num < req.min_value) return false;
    return true;
  }
  return false;
}
