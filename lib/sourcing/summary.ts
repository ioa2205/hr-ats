/**
 * Pure aggregation helpers for the sourcing observability surfaces (Phase 4
 * polish): the operator activity/cost view and the per-job run history.
 *
 * Runtime-agnostic and side-effect-free so the arithmetic is unit-tested under
 * Vitest with no DB. Two concerns:
 *  - {@link summarizeRuns}: roll a set of searches up into totals an operator
 *    reads at a glance (how many runs, how they ended, total AI spend).
 *  - {@link funnelDrops}: turn the per-stage counts the funnel already records
 *    into an HONEST "where candidates were excluded" breakdown — derived purely
 *    from the stats, never inventing a reason. This is the aggregate answer to
 *    "why isn't person X here": each stage shows how many were dropped and why.
 */
import type { SourcingStats, SourcingStatus } from "./types";

export interface RunCostLike {
  status: SourcingStatus;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | string | null;
}

export interface RunsSummary {
  total: number;
  byStatus: Record<SourcingStatus, number>;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
}

const ALL_STATUSES: SourcingStatus[] = [
  "queued",
  "running",
  "completed",
  "partial",
  "failed",
];

function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Roll a list of runs into operator-facing totals. `cost_usd` may arrive as a
 * numeric string (Postgres `numeric` is serialized as text by supabase-js), so
 * it is coerced defensively; non-finite values count as zero (never NaN).
 */
export function summarizeRuns(runs: readonly RunCostLike[]): RunsSummary {
  const byStatus = ALL_STATUSES.reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<SourcingStatus, number>,
  );
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;

  for (const run of runs) {
    if (run.status in byStatus) byStatus[run.status] += 1;
    totalInputTokens += toNumber(run.input_tokens);
    totalOutputTokens += toNumber(run.output_tokens);
    totalCostUsd += toNumber(run.cost_usd);
  }

  return {
    total: runs.length,
    byStatus,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd,
  };
}

/** A single rung of the funnel: how many entered, how many were dropped here. */
export interface FunnelDrop {
  /** stable stage key — maps to an i18n label + reason string by the caller. */
  stage: "dedup" | "gate" | "score" | "verify";
  /** count that entered this stage. */
  entered: number;
  /** count dropped at this stage (never negative). */
  dropped: number;
  /** count that survived into the next stage. */
  kept: number;
}

function drop(stage: FunnelDrop["stage"], entered: number, kept: number): FunnelDrop {
  // Clamp: the funnel only ever shrinks stage-to-stage, but guard against a
  // partially-written stats checkpoint (a resume mid-stage) producing a
  // negative — we never claim more were dropped than entered.
  const safeKept = Math.min(Math.max(kept, 0), Math.max(entered, 0));
  return { stage, entered: Math.max(entered, 0), kept: safeKept, dropped: Math.max(entered, 0) - safeKept };
}

/**
 * Derive the per-stage exclusion breakdown from the funnel's own counts. Order
 * mirrors the funnel: fetched →(dedup) deduped →(gate) gate_passed →(score)
 * scored →(verify) verified. Each rung is honest about the drop without
 * fabricating a per-person reason: duplicates merged, hard requirement unmet,
 * not scored (budget/error), and verification not re-confirmed.
 */
export function funnelDrops(stats: Partial<SourcingStats>): FunnelDrop[] {
  const fetched = stats.fetched ?? 0;
  const deduped = stats.deduped ?? 0;
  const gatePassed = stats.gate_passed ?? 0;
  const scored = stats.scored ?? 0;
  const verified = stats.verified ?? 0;
  return [
    drop("dedup", fetched, deduped),
    drop("gate", deduped, gatePassed),
    drop("score", gatePassed, scored),
    drop("verify", scored, verified),
  ];
}
