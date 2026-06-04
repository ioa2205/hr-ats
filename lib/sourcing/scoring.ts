/**
 * Deep-score assembly (Phase 1.4 stage 4). The model returns per-axis 0–100
 * sub-scores (Appendix C); the weighted total is computed HERE, not trusted
 * from the model. Weights are fixed and transparent and sum to 1.0, so the
 * total stays in 0–100.
 */
import type { DeepScore, ScoreAxis } from "./types";
import type { ScoreResultRaw } from "./schema";

// seniority_fit and experience_relevance both keyed off tenure, so a senior
// scored high on BOTH even when over/under-qualified for the role. Rebalanced
// (experience 0.25→0.20, seniority 0.15→0.20) so a seniority mismatch actually
// moves the total. Must still sum to 1.0 (asserted in tests).
export const SCORE_AXIS_WEIGHTS = {
  skills_match: 0.3,
  experience_relevance: 0.2,
  seniority_fit: 0.2,
  language_fit: 0.1,
  recency_activity: 0.1,
  nice_to_haves_covered: 0.1,
} as const;

export type ScoreAxisKey = keyof typeof SCORE_AXIS_WEIGHTS;

const AXIS_KEYS = Object.keys(SCORE_AXIS_WEIGHTS) as ScoreAxisKey[];

/** Map a validated score result into a DeepScore with the computed weighted total. */
export function computeDeepScore(raw: ScoreResultRaw): DeepScore {
  const axes: ScoreAxis[] = AXIS_KEYS.map((axis) => ({
    axis,
    score: raw[axis].score,
    evidence: raw[axis].evidence,
  }));
  const weighted = AXIS_KEYS.reduce(
    (sum, axis) => sum + raw[axis].score * SCORE_AXIS_WEIGHTS[axis],
    0,
  );
  return {
    total: Math.round(weighted * 100) / 100,
    axes,
    gaps: raw.gaps,
    risks: raw.risks,
    confidence: raw.confidence,
  };
}
