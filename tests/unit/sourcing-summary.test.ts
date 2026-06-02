import { describe, it, expect } from "vitest";
import { summarizeRuns, funnelDrops, type RunCostLike } from "@/lib/sourcing/summary";
import type { SourcingStats } from "@/lib/sourcing/types";

describe("summarizeRuns", () => {
  it("counts runs by status and sums tokens + cost", () => {
    const runs: RunCostLike[] = [
      { status: "completed", input_tokens: 100, output_tokens: 50, cost_usd: 0.01 },
      { status: "completed", input_tokens: 200, output_tokens: 80, cost_usd: 0.02 },
      { status: "partial", input_tokens: 50, output_tokens: 20, cost_usd: 0.005 },
      { status: "failed", input_tokens: 0, output_tokens: 0, cost_usd: 0 },
      { status: "running", input_tokens: null, output_tokens: null, cost_usd: null },
    ];
    const s = summarizeRuns(runs);
    expect(s.total).toBe(5);
    expect(s.byStatus.completed).toBe(2);
    expect(s.byStatus.partial).toBe(1);
    expect(s.byStatus.failed).toBe(1);
    expect(s.byStatus.running).toBe(1);
    expect(s.byStatus.queued).toBe(0);
    expect(s.totalInputTokens).toBe(350);
    expect(s.totalOutputTokens).toBe(150);
    expect(s.totalCostUsd).toBeCloseTo(0.035, 6);
  });

  it("coerces Postgres numeric-as-string cost without producing NaN", () => {
    const s = summarizeRuns([
      { status: "completed", input_tokens: 10, output_tokens: 5, cost_usd: "0.123456" },
      { status: "completed", input_tokens: 10, output_tokens: 5, cost_usd: "not-a-number" },
    ]);
    expect(s.totalCostUsd).toBeCloseTo(0.123456, 6);
    expect(Number.isNaN(s.totalCostUsd)).toBe(false);
  });

  it("returns a zeroed summary for an empty list (every status present)", () => {
    const s = summarizeRuns([]);
    expect(s.total).toBe(0);
    expect(s.totalCostUsd).toBe(0);
    expect(Object.keys(s.byStatus).sort()).toEqual([
      "completed",
      "failed",
      "partial",
      "queued",
      "running",
    ]);
  });
});

describe("funnelDrops", () => {
  const stats: SourcingStats = {
    fetched: 100,
    deduped: 80,
    gate_passed: 30,
    scored: 28,
    verified: 25,
    shortlisted: 20,
    per_source: {},
    degraded_sources: [],
  };

  it("derives drop/kept per stage straight from the counts", () => {
    const rungs = funnelDrops(stats);
    expect(rungs.map((r) => r.stage)).toEqual(["dedup", "gate", "score", "verify"]);
    expect(rungs[0]).toMatchObject({ entered: 100, kept: 80, dropped: 20 }); // dedup
    expect(rungs[1]).toMatchObject({ entered: 80, kept: 30, dropped: 50 }); // gate
    expect(rungs[2]).toMatchObject({ entered: 30, kept: 28, dropped: 2 }); // score
    expect(rungs[3]).toMatchObject({ entered: 28, kept: 25, dropped: 3 }); // verify
  });

  it("never reports a negative drop when a checkpoint is mid-stage/inconsistent", () => {
    // kept > entered (e.g. a partial resume wrote scored before gate_passed)
    const rungs = funnelDrops({ fetched: 0, deduped: 0, gate_passed: 0, scored: 5 });
    for (const r of rungs) {
      expect(r.dropped).toBeGreaterThanOrEqual(0);
      expect(r.kept).toBeLessThanOrEqual(r.entered);
    }
  });

  it("treats missing stats as all-zero (no run yet)", () => {
    const rungs = funnelDrops({});
    expect(rungs.every((r) => r.entered === 0 && r.kept === 0 && r.dropped === 0)).toBe(true);
  });
});
