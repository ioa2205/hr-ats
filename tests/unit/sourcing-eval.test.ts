import { describe, it, expect } from "vitest";
import { compareFixture, type FixtureActual } from "@/lib/sourcing/eval";

function actual(over: Partial<FixtureActual> = {}): FixtureActual {
  return { gate_pass: true, verify_pass: true, score_total: 70, ...over };
}

describe("compareFixture — golden-set assertion logic", () => {
  it("passes when every present expectation matches", () => {
    const cmp = compareFixture("ok", { gate_pass: true, verify_pass: true, score_gte: 60 }, actual());
    expect(cmp.ok).toBe(true);
    expect(cmp.mismatches).toEqual([]);
  });

  it("flags a gate mismatch", () => {
    const cmp = compareFixture("g", { gate_pass: false }, actual({ gate_pass: true }));
    expect(cmp.ok).toBe(false);
    expect(cmp.mismatches[0]).toContain("gate_pass");
  });

  it("only checks verify_pass when the expectation is present", () => {
    const cmp = compareFixture("v", { gate_pass: true }, actual({ verify_pass: false }));
    expect(cmp.ok).toBe(true);
  });

  it("flags a score below the minimum", () => {
    const cmp = compareFixture("s", { gate_pass: true, score_gte: 80 }, actual({ score_total: 55 }));
    expect(cmp.ok).toBe(false);
    expect(cmp.mismatches[0]).toContain("score_gte");
  });

  it("flags score_gte when the gate did not pass so no score was produced", () => {
    const cmp = compareFixture(
      "s2",
      { gate_pass: true, score_gte: 50 },
      actual({ gate_pass: true, score_total: null }),
    );
    expect(cmp.ok).toBe(false);
    expect(cmp.mismatches[0]).toContain("no score");
  });
});
