/**
 * The ranking funnel (Phase 1.4). Runtime-agnostic and dependency-injected:
 * the Gemini calls, connectors, persistence callbacks, and logger are all
 * passed in, so this exact orchestration runs under Vitest with fakes AND in
 * the Deno edge worker with real clients. The accuracy guarantee lives here by
 * construction — every survivor clears the fail-closed gate AND an independent
 * verification before it can be ranked.
 *
 * Stages: 0 freeze requirement profile (Pro, once) → 1 fetch (connectors,
 * budget-capped, a failing connector degrades the run to `partial`) → 2 dedup
 * → 3 hard-requirement gate (Flash, fail-closed) → 4 deep score (Pro,
 * survivors only) → 5 independent verification (Pro, finalists) → 6 rank + take
 * top 20. Never pads past the gate; surfaces the true count via stats.
 */
import type { HardRequirement } from "@/types";
import { evaluateGate, evaluateVerification } from "./gate";
import { dedupe, type DedupedProfile } from "./identity";
import { buildRequirementProfile, type PostingSeed } from "./requirement-profile";
import { computeDeepScore } from "./scoring";
import { rankAndShortlist } from "./rank";
import { ZERO_COST, addUsage, type RunCost, type TokenUsage } from "./cost";
import {
  emptyStats,
  SHORTLIST_SIZE,
  type DeepScore,
  type FetchBudget,
  type NormalizedProfile,
  type RawSourcedProfile,
  type RequirementProfile,
  type RequirementProfileExtraction,
  type RequirementResult,
  type SourceConnector,
  type SourcedContact,
  type SourceKind,
  type SourcingStats,
} from "./types";
import type {
  GateResultsRaw,
  ScoreResultRaw,
  VerifyResultRaw,
} from "./schema";

export interface SourcingLogger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

export interface GeminiCallResult<T> {
  data: T;
  usage: TokenUsage;
}

export interface FunnelDeps {
  connectors: SourceConnector[];
  /** Pro — Appendix A. */
  extractProfile(posting: PostingSeed): Promise<GeminiCallResult<RequirementProfileExtraction>>;
  /** Flash — Appendix B. */
  runGate(
    source: NormalizedProfile,
    requirements: HardRequirement[],
  ): Promise<GeminiCallResult<GateResultsRaw>>;
  /** Pro — Appendix C. */
  runScore(
    source: NormalizedProfile,
    profile: RequirementProfile,
  ): Promise<GeminiCallResult<ScoreResultRaw>>;
  /** Pro — Appendix D. */
  runVerify(
    source: NormalizedProfile,
    requirements: HardRequirement[],
    prior: RequirementResult[],
  ): Promise<GeminiCallResult<VerifyResultRaw>>;
  logger: SourcingLogger;
  /** Persist the frozen profile the moment it is computed (so it survives a
   *  resume). Optional. */
  onProfileFrozen?(profile: RequirementProfile, cost: RunCost): Promise<void> | void;
  /** Persist a stats/cost checkpoint between stages. Optional. */
  onProgress?(stats: SourcingStats, cost: RunCost): Promise<void> | void;
}

export interface FunnelInput {
  posting: PostingSeed;
  /** if already frozen from a prior attempt, reused verbatim (not recomputed). */
  frozenProfile: RequirementProfile | null;
  budget: FetchBudget;
}

export interface ShortlistEntry {
  identity_key: string;
  source: SourceKind;
  source_ref: string;
  profile: NormalizedProfile;
  contact: SourcedContact;
  requirement_results: RequirementResult[];
  meets_all_requirements: boolean;
  score: number;
  score_breakdown: DeepScore;
  verified: boolean;
  rank: number;
}

export interface FunnelResult {
  requirementProfile: RequirementProfile;
  shortlist: ShortlistEntry[];
  stats: SourcingStats;
  cost: RunCost;
  status: "completed" | "partial";
}

async function collectConnector(
  connector: SourceConnector,
  profile: RequirementProfile,
  budget: FetchBudget,
  remaining: number,
): Promise<RawSourcedProfile[]> {
  const out: RawSourcedProfile[] = [];
  for await (const record of connector.fetch(profile, budget)) {
    out.push(record);
    if (out.length >= remaining) break;
  }
  return out;
}

function degradedDetail(source: SourceKind, reason: unknown): SourcingStats["degraded_details"][number] {
  const obj = reason && typeof reason === "object" ? (reason as Record<string, unknown>) : {};
  const status = typeof obj.status === "number" ? obj.status : undefined;
  const code = typeof obj.code === "string" ? obj.code.slice(0, 80) : undefined;
  const rawMessage =
    reason instanceof Error ? reason.message : typeof reason === "string" ? reason : String(reason);
  const message = rawMessage
    .replace(/(access_token|refresh_token|client_secret)["'=:\s]+[^"',\s}]+/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .slice(0, 240);
  return { source, status, code, message };
}

/**
 * How many per-candidate Gemini calls run at once within a stage. The funnel is
 * dominated by independent per-candidate calls (gate/score/verify), so bounded
 * concurrency turns a minutes-long sequential run into seconds without tripping
 * Gemini rate limits.
 */
const JUDGE_CONCURRENCY = 6;

/** Map over items with a fixed worker pool, preserving input order in the output. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker(): Promise<void> {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

export async function runFunnel(input: FunnelInput, deps: FunnelDeps): Promise<FunnelResult> {
  const stats = emptyStats();
  let cost = ZERO_COST;
  let degraded = false;

  // --- Stage 0: freeze the requirement profile (once) -------------------
  let profile = input.frozenProfile;
  if (!profile) {
    const extraction = await deps.extractProfile(input.posting);
    cost = addUsage(cost, "flash", extraction.usage);
    profile = buildRequirementProfile(input.posting, extraction.data);
    await deps.onProfileFrozen?.(profile, cost);
  }
  const requirements = profile.hard_requirements;

  // --- Stage 1: fetch from configured connectors concurrently -----------
  const configured = deps.connectors.filter((connector) => connector.isConfigured());
  const fetched: RawSourcedProfile[] = [];
  const results = await Promise.allSettled(
    configured.map((connector) =>
      collectConnector(connector, profile as RequirementProfile, input.budget, input.budget.maxFetched),
    ),
  );
  results.forEach((result, index) => {
    const connector = configured[index];
    if (result.status === "rejected") {
      degraded = true;
      stats.degraded_sources.push(connector.kind);
      stats.degraded_details.push(degradedDetail(connector.kind, result.reason));
      deps.logger.warn(
        { source: connector.kind, err: String(result.reason) },
        "[sourcing] connector degraded",
      );
      return;
    }
    const slice = result.value.slice(0, Math.max(0, input.budget.maxFetched - fetched.length));
    stats.per_source[connector.kind] = (stats.per_source[connector.kind] ?? 0) + slice.length;
    fetched.push(...slice);
  });
  stats.fetched = fetched.length;
  await deps.onProgress?.(stats, cost);

  // --- Stage 2: dedup ---------------------------------------------------
  const deduped: DedupedProfile[] = dedupe(fetched);
  stats.deduped = deduped.length;
  await deps.onProgress?.(stats, cost);

  // --- Stage 3: hard-requirement gate (Flash, fail-closed, concurrent) --
  interface Gated {
    record: DedupedProfile;
    requirement_results: RequirementResult[];
  }
  const gateOutcomes = await mapWithConcurrency(deduped, JUDGE_CONCURRENCY, async (record) => {
    try {
      const call = await deps.runGate(record.profile, requirements);
      return { record, usage: call.usage, data: call.data, ok: true as const };
    } catch (err) {
      // fail-closed: a gate error excludes the candidate, never passes them.
      deps.logger.warn(
        { identity: record.identity_key, err: String(err) },
        "[sourcing] gate call failed; excluding candidate",
      );
      return { record, ok: false as const };
    }
  });
  const gated: Gated[] = [];
  for (const r of gateOutcomes) {
    if (!r.ok) continue;
    cost = addUsage(cost, "flash", r.usage);
    const outcome = evaluateGate(requirements, r.data.requirements);
    if (outcome.meets_all_requirements) {
      gated.push({ record: r.record, requirement_results: outcome.results });
    }
  }
  stats.gate_passed = gated.length;
  await deps.onProgress?.(stats, cost);

  // Judgement-call budget (score + verify), a safety ceiling — not normally hit.
  const judgeBudget = input.budget.maxProCalls;
  let judgeUsed = input.frozenProfile ? 0 : 1; // stage-0 extraction call

  // --- Stage 4: deep score (Flash, survivors only, concurrent) ----------
  interface Scored extends Gated {
    score: DeepScore;
  }
  const toScore = gated.slice(0, Math.max(0, judgeBudget - judgeUsed));
  if (toScore.length < gated.length) {
    deps.logger.warn(
      { scored: toScore.length, remaining: gated.length - toScore.length },
      "[sourcing] judge budget reached before scoring all survivors",
    );
  }
  const scoreOutcomes = await mapWithConcurrency(toScore, JUDGE_CONCURRENCY, async (item) => {
    try {
      const call = await deps.runScore(item.record.profile, profile as RequirementProfile);
      return { item, usage: call.usage, data: call.data, ok: true as const };
    } catch (err) {
      deps.logger.warn(
        { identity: item.record.identity_key, err: String(err) },
        "[sourcing] score call failed; excluding candidate",
      );
      return { item, ok: false as const };
    }
  });
  const scored: Scored[] = [];
  for (const r of scoreOutcomes) {
    if (!r.ok) continue;
    cost = addUsage(cost, "flash", r.usage);
    scored.push({ ...r.item, score: computeDeepScore(r.data) });
  }
  judgeUsed += toScore.length;
  stats.scored = scored.length;
  await deps.onProgress?.(stats, cost);

  // --- Stage 5: independent verification (Flash, finalists, concurrent) -
  // Verify the strongest finalists first so the budget protects the candidates
  // most likely to be shown.
  const byScoreDesc = [...scored].sort((a, b) => b.score.total - a.score.total);
  const toVerify = byScoreDesc.slice(0, Math.max(0, judgeBudget - judgeUsed));
  if (toVerify.length < byScoreDesc.length) {
    deps.logger.warn(
      { verifying: toVerify.length, remaining: byScoreDesc.length - toVerify.length },
      "[sourcing] judge budget reached before verifying all finalists",
    );
  }
  const verifyOutcomes = await mapWithConcurrency(toVerify, JUDGE_CONCURRENCY, async (item) => {
    try {
      const call = await deps.runVerify(item.record.profile, requirements, item.requirement_results);
      return { item, usage: call.usage, data: call.data, ok: true as const };
    } catch (err) {
      // fail-closed: cannot verify ⇒ drop the finalist.
      deps.logger.warn(
        { identity: item.record.identity_key, err: String(err) },
        "[sourcing] verify call failed; dropping finalist",
      );
      return { item, ok: false as const };
    }
  });
  const verified: ShortlistEntry[] = [];
  for (const r of verifyOutcomes) {
    if (!r.ok) continue;
    cost = addUsage(cost, "flash", r.usage);
    // The gate already passed for every `scored` item (stage 3 only kept
    // meets_all). Re-confirm independently against the same gate-true baseline.
    const verification = evaluateVerification(
      requirements,
      { meets_all_requirements: true, results: r.item.requirement_results },
      r.data.requirements,
    );
    if (!verification.verified) {
      deps.logger.info(
        { identity: r.item.record.identity_key },
        "[sourcing] finalist not re-confirmed by verification; dropped",
      );
      continue;
    }
    verified.push({
      identity_key: r.item.record.identity_key,
      source: r.item.record.source,
      source_ref: r.item.record.source_ref,
      profile: r.item.record.profile,
      contact: r.item.record.contact,
      requirement_results: r.item.requirement_results,
      meets_all_requirements: true,
      score: r.item.score.total,
      score_breakdown: r.item.score,
      verified: true,
      rank: 0,
    });
  }
  stats.verified = verified.length;
  await deps.onProgress?.(stats, cost);

  // --- Stage 6: rank + take top 20 (never pad) --------------------------
  const ranked = rankAndShortlist(verified, SHORTLIST_SIZE);
  const shortlist = ranked.map((entry) => ({ ...entry, rank: entry.rank }));
  stats.shortlisted = shortlist.length;
  await deps.onProgress?.(stats, cost);

  return {
    requirementProfile: profile,
    shortlist,
    stats,
    cost,
    status: degraded ? "partial" : "completed",
  };
}
