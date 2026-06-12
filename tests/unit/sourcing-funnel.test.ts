import { describe, it, expect, vi } from "vitest";
import type { HardRequirement } from "@/types";
import { runFunnel, type FunnelDeps, type SourcingLogger } from "@/lib/sourcing/funnel";
import type {
  FetchBudget,
  RawSourcedProfile,
  RequirementResult,
  RequirementVerification,
  SourceConnector,
  SourceKind,
} from "@/lib/sourcing/types";
import type { ScoreResultRaw } from "@/lib/sourcing/schema";

const R1: HardRequirement = { id: "r1", label_ru: "Права", label_uz: "Guvohnoma", type: "boolean", min_value: null, order: 0 };
const R2: HardRequirement = { id: "r2", label_ru: "Опыт 3 года", label_uz: "3 yil", type: "number", min_value: 3, order: 1 };
const REQS = [R1, R2];

const BUDGET: FetchBudget = { maxFetched: 100, maxProCalls: 50, tokenCeiling: 5_000_000 };

const noopLogger: SourcingLogger = { info: () => {}, warn: () => {}, error: () => {} };

let phoneSeq = 0;
function record(name: string, source: SourceKind = "internal_pool", phone?: string): RawSourcedProfile {
  phoneSeq += 1;
  return {
    source,
    source_ref: `${source}:${name}`,
    profile: { full_name: name, headline: null, location: null, fields: [], raw_text: name },
    contact: { phone: phone ?? `+99890000${String(phoneSeq).padStart(4, "0")}`, email: null, telegram: null, profile_url: null },
  };
}

function fakeConnector(kind: SourceKind, records: RawSourcedProfile[], throws = false): SourceConnector {
  return {
    kind,
    isConfigured: () => true,
    async *fetch() {
      if (throws) throw new Error(`${kind} down`);
      for (const r of records) yield r;
    },
  };
}

function metVerdict(id: string, over: Partial<RequirementResult> = {}): RequirementResult {
  return { requirement_id: id, met: true, evidence: `evidence for ${id}`, confidence: 0.95, ...over };
}

function axes(value: number): ScoreResultRaw {
  const a = { score: value, evidence: "q" };
  return {
    skills_match: a,
    experience_relevance: a,
    seniority_fit: a,
    language_fit: a,
    recency_activity: a,
    nice_to_haves_covered: a,
    gaps: [],
    risks: [],
    confidence: 0.9,
  };
}

interface FakeConfig {
  connectors: SourceConnector[];
  gate: Record<string, RequirementResult[]>;
  score: Record<string, number>;
  verify?: Record<string, RequirementVerification[]>;
  logger?: SourcingLogger;
}

const PRO_USAGE = { promptTokens: 10, outputTokens: 5 };

function makeDeps(config: FakeConfig): FunnelDeps {
  return {
    connectors: config.connectors,
    logger: config.logger ?? noopLogger,
    async extractProfile() {
      return {
        data: { must_haves: [], nice_to_haves: [], seniority: "", required_languages: [], search_keywords: [] },
        usage: PRO_USAGE,
      };
    },
    async runGate(source) {
      return { data: { requirements: config.gate[source.full_name] ?? [] }, usage: { promptTokens: null, outputTokens: null } };
    },
    async runScore(source) {
      return { data: axes(config.score[source.full_name] ?? 0), usage: PRO_USAGE };
    },
    async runVerify(source) {
      const fallback = REQS.map((r) => ({ requirement_id: r.id, confirmed: true, note: "" }));
      return { data: { requirements: config.verify?.[source.full_name] ?? fallback, verified: true }, usage: PRO_USAGE };
    },
  };
}

const posting = {
  title: "Driver",
  description: "We need a driver in Tashkent.",
  required_skills: [],
  hard_requirements: REQS,
};

describe("runFunnel — accuracy guarantee end-to-end", () => {
  it("excludes a candidate who misses exactly one hard requirement, however strong otherwise", async () => {
    const deps = makeDeps({
      connectors: [fakeConnector("internal_pool", [record("Strong"), record("MissesOne")])],
      gate: {
        Strong: [metVerdict("r1"), metVerdict("r2")],
        // r2 explicitly not met — even with a sky-high score this must be absent.
        MissesOne: [metVerdict("r1"), metVerdict("r2", { met: false, evidence: "" })],
      },
      score: { Strong: 50, MissesOne: 100 },
    });
    const result = await runFunnel({ posting, frozenProfile: null, budget: BUDGET }, deps);
    const names = result.shortlist.map((e) => e.profile.full_name);
    expect(names).toContain("Strong");
    expect(names).not.toContain("MissesOne");
    expect(result.stats.gate_passed).toBe(1);
  });

  it("excludes a candidate whose evidence is ambiguous / low-confidence (fail-closed)", async () => {
    const deps = makeDeps({
      connectors: [fakeConnector("internal_pool", [record("Ambiguous")])],
      gate: { Ambiguous: [metVerdict("r1"), metVerdict("r2", { confidence: 0.4 })] },
      score: { Ambiguous: 100 },
    });
    const result = await runFunnel({ posting, frozenProfile: null, budget: BUDGET }, deps);
    expect(result.shortlist).toHaveLength(0);
    expect(result.stats.gate_passed).toBe(0);
  });

  it("drops a finalist the independent verification pass cannot re-confirm", async () => {
    const deps = makeDeps({
      connectors: [fakeConnector("internal_pool", [record("Strong"), record("Unverified")])],
      gate: {
        Strong: [metVerdict("r1"), metVerdict("r2")],
        Unverified: [metVerdict("r1"), metVerdict("r2")],
      },
      score: { Strong: 60, Unverified: 95 },
      // verifier refuses to re-confirm r2 for Unverified despite the gate passing.
      verify: { Unverified: [{ requirement_id: "r1", confirmed: true, note: "" }, { requirement_id: "r2", confirmed: false, note: "estimated" }] },
    });
    const result = await runFunnel({ posting, frozenProfile: null, budget: BUDGET }, deps);
    const names = result.shortlist.map((e) => e.profile.full_name);
    expect(names).toEqual(["Strong"]);
    expect(result.stats.scored).toBe(2);
    expect(result.stats.verified).toBe(1);
    expect(result.stats.shortlisted).toBe(1);
  });

  it("ranks the shortlist by score descending with 1-based ranks; never pads past the gate", async () => {
    const deps = makeDeps({
      connectors: [fakeConnector("internal_pool", [record("Mid"), record("Top"), record("Low")])],
      gate: Object.fromEntries(
        ["Mid", "Top", "Low"].map((n) => [n, [metVerdict("r1"), metVerdict("r2")]]),
      ),
      score: { Mid: 70, Top: 99, Low: 40 },
    });
    const result = await runFunnel({ posting, frozenProfile: null, budget: BUDGET }, deps);
    expect(result.shortlist.map((e) => e.profile.full_name)).toEqual(["Top", "Mid", "Low"]);
    expect(result.shortlist.map((e) => e.rank)).toEqual([1, 2, 3]);
    expect(result.shortlist.every((e) => e.verified && e.meets_all_requirements)).toBe(true);
  });

  it("collapses duplicates (same name+phone) before scoring", async () => {
    const dup = "+998900001111";
    const deps = makeDeps({
      connectors: [
        fakeConnector("internal_pool", [record("Twin", "internal_pool", dup), record("Twin", "internal_pool", dup)]),
      ],
      gate: { Twin: [metVerdict("r1"), metVerdict("r2")] },
      score: { Twin: 80 },
    });
    const result = await runFunnel({ posting, frozenProfile: null, budget: BUDGET }, deps);
    expect(result.stats.fetched).toBe(2);
    expect(result.stats.deduped).toBe(1);
    expect(result.shortlist).toHaveLength(1);
  });

  it("degrades to `partial` when a connector fails, still processing the healthy source", async () => {
    const deps = makeDeps({
      connectors: [
        fakeConnector("internal_pool", [record("Good")]),
        fakeConnector("hh", [], true),
      ],
      gate: { Good: [metVerdict("r1"), metVerdict("r2")] },
      score: { Good: 75 },
    });
    const result = await runFunnel({ posting, frozenProfile: null, budget: BUDGET }, deps);
    expect(result.status).toBe("partial");
    expect(result.stats.degraded_sources).toContain("hh");
    expect(result.stats.degraded_details[0]).toMatchObject({ source: "hh" });
    expect(result.shortlist.map((e) => e.profile.full_name)).toEqual(["Good"]);
  });

  it("respects the Pro-call budget and logs the truncation", async () => {
    const warn = vi.fn();
    const deps = makeDeps({
      connectors: [fakeConnector("internal_pool", [record("A"), record("B")])],
      gate: { A: [metVerdict("r1"), metVerdict("r2")], B: [metVerdict("r1"), metVerdict("r2")] },
      score: { A: 80, B: 80 },
      logger: { info: () => {}, warn, error: () => {} },
    });
    // maxProCalls=1 is fully consumed by the stage-0 extraction ⇒ no scoring.
    const result = await runFunnel({ posting, frozenProfile: null, budget: { ...BUDGET, maxProCalls: 1 } }, deps);
    expect(result.stats.scored).toBe(0);
    expect(result.shortlist).toHaveLength(0);
    expect(warn).toHaveBeenCalled();
  });

  it("accumulates Pro token cost and never invents Flash tokens", async () => {
    const deps = makeDeps({
      connectors: [fakeConnector("internal_pool", [record("Solo")])],
      gate: { Solo: [metVerdict("r1"), metVerdict("r2")] },
      score: { Solo: 88 },
    });
    const result = await runFunnel({ posting, frozenProfile: null, budget: BUDGET }, deps);
    // pro calls = extract(1) + score(1) + verify(1) = 3 → 3*10 input, 3*5 output.
    expect(result.cost.inputTokens).toBe(30);
    expect(result.cost.outputTokens).toBe(15);
    expect(result.cost.costUsd).toBeGreaterThan(0);
  });

  it("defaults to strict: a one-requirement near-miss is excluded with no strictness set", async () => {
    const deps = makeDeps({
      connectors: [fakeConnector("internal_pool", [record("Near")])],
      gate: { Near: [metVerdict("r1"), metVerdict("r2", { met: false, evidence: "" })] },
      score: { Near: 100 },
    });
    const result = await runFunnel({ posting, frozenProfile: null, budget: BUDGET }, deps);
    expect(result.shortlist).toHaveLength(0);
  });
});

describe("runFunnel — strictness modes", () => {
  it("balanced keeps a one-requirement near-miss, flagged and ranked below full matches", async () => {
    const deps = makeDeps({
      connectors: [fakeConnector("internal_pool", [record("Full"), record("Near")])],
      gate: {
        Full: [metVerdict("r1"), metVerdict("r2")],
        // misses r2 — even with a higher score it must rank BELOW the full match.
        Near: [metVerdict("r1"), metVerdict("r2", { met: false, evidence: "" })],
      },
      score: { Full: 50, Near: 100 },
    });
    const result = await runFunnel(
      { posting, frozenProfile: null, budget: BUDGET, strictness: "balanced" },
      deps,
    );
    expect(result.shortlist.map((e) => e.profile.full_name)).toEqual(["Full", "Near"]);
    const near = result.shortlist.find((e) => e.profile.full_name === "Near")!;
    expect(near.near_miss).toBe(true);
    expect(near.meets_all_requirements).toBe(false);
    expect(near.missed_requirements.map((m) => m.id)).toEqual(["r2"]);
    const full = result.shortlist.find((e) => e.profile.full_name === "Full")!;
    expect(full.near_miss).toBe(false);
    expect(full.meets_all_requirements).toBe(true);
  });

  it("balanced still drops a candidate missing TWO requirements (beyond tolerance)", async () => {
    const deps = makeDeps({
      connectors: [fakeConnector("internal_pool", [record("TooWeak")])],
      gate: {
        TooWeak: [
          metVerdict("r1", { met: false, evidence: "" }),
          metVerdict("r2", { met: false, evidence: "" }),
        ],
      },
      score: { TooWeak: 100 },
    });
    const result = await runFunnel(
      { posting, frozenProfile: null, budget: BUDGET, strictness: "balanced" },
      deps,
    );
    expect(result.shortlist).toHaveLength(0);
  });

  it("broad tolerates two missing requirements and verifies on the met subset only", async () => {
    const deps = makeDeps({
      connectors: [fakeConnector("internal_pool", [record("Weak")])],
      gate: {
        Weak: [
          metVerdict("r1", { met: false, evidence: "" }),
          metVerdict("r2", { met: false, evidence: "" }),
        ],
      },
      score: { Weak: 80 },
    });
    const result = await runFunnel(
      { posting, frozenProfile: null, budget: BUDGET, strictness: "broad" },
      deps,
    );
    expect(result.shortlist).toHaveLength(1);
    expect(result.shortlist[0].near_miss).toBe(true);
    expect(result.shortlist[0].missed_requirements.map((m) => m.id).sort()).toEqual(["r1", "r2"]);
  });

  it("clamps the shortlist to the operator-provided cap", async () => {
    const names = ["A", "B", "C", "D"];
    const deps = makeDeps({
      connectors: [fakeConnector("internal_pool", names.map((n) => record(n)))],
      gate: Object.fromEntries(names.map((n) => [n, [metVerdict("r1"), metVerdict("r2")]])),
      score: Object.fromEntries(names.map((n, i) => [n, 90 - i])),
    });
    const result = await runFunnel(
      { posting, frozenProfile: null, budget: BUDGET, strictness: "broad", shortlistCap: 2 },
      deps,
    );
    expect(result.shortlist).toHaveLength(2);
    expect(result.shortlist.map((e) => e.profile.full_name)).toEqual(["A", "B"]);
  });
});
