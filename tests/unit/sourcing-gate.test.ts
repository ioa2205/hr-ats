import { describe, it, expect } from "vitest";
import type { HardRequirement } from "@/types";
import { evaluateGate, evaluateVerification } from "@/lib/sourcing/gate";
import type { RequirementResult, RequirementVerification } from "@/lib/sourcing/types";

function req(
  id: string,
  type: "boolean" | "number" = "boolean",
  min: number | null = null,
): HardRequirement {
  return { id, label_ru: id, label_uz: id, type, min_value: min, order: 0 };
}

function verdict(over: Partial<RequirementResult> & { requirement_id: string }): RequirementResult {
  return { met: true, evidence: "stated in profile", confidence: 0.95, ...over };
}

describe("evaluateGate — fail-closed hard-requirement gate", () => {
  it("passes a candidate only when every requirement is met with cited high-confidence evidence", () => {
    const reqs = [req("a"), req("b")];
    const outcome = evaluateGate(reqs, [verdict({ requirement_id: "a" }), verdict({ requirement_id: "b" })]);
    expect(outcome.meets_all_requirements).toBe(true);
    expect(outcome.results).toHaveLength(2);
  });

  it("fails closed when a requirement has NO verdict at all", () => {
    const reqs = [req("a"), req("b")];
    const outcome = evaluateGate(reqs, [verdict({ requirement_id: "a" })]);
    expect(outcome.meets_all_requirements).toBe(false);
    const b = outcome.results.find((r) => r.requirement_id === "b");
    expect(b).toMatchObject({ met: false, evidence: "", confidence: 0 });
  });

  it("fails closed when evidence is empty/whitespace even if met:true with high confidence", () => {
    const outcome = evaluateGate(
      [req("a")],
      [verdict({ requirement_id: "a", met: true, evidence: "   ", confidence: 1 })],
    );
    expect(outcome.meets_all_requirements).toBe(false);
    expect(outcome.results[0].met).toBe(false);
  });

  it("fails closed on low / ambiguous confidence (below threshold) despite met:true + evidence", () => {
    const outcome = evaluateGate(
      [req("a")],
      [verdict({ requirement_id: "a", met: true, evidence: "maybe relevant", confidence: 0.5 })],
    );
    expect(outcome.meets_all_requirements).toBe(false);
    // evidence + confidence are preserved for the UI even though it's a fail.
    expect(outcome.results[0]).toMatchObject({ met: false, confidence: 0.5 });
  });

  it("passes exactly at the confidence threshold (0.7)", () => {
    const outcome = evaluateGate(
      [req("a")],
      [verdict({ requirement_id: "a", confidence: 0.7 })],
    );
    expect(outcome.meets_all_requirements).toBe(true);
  });

  it("treats met:false as not met regardless of evidence/confidence", () => {
    const outcome = evaluateGate(
      [req("a")],
      [verdict({ requirement_id: "a", met: false, evidence: "explicitly absent", confidence: 1 })],
    );
    expect(outcome.results[0].met).toBe(false);
  });

  it("fails closed on malformed confidence (NaN / missing)", () => {
    const reqs = [req("a"), req("b")];
    const outcome = evaluateGate(reqs, [
      { requirement_id: "a", met: true, evidence: "ok", confidence: Number.NaN },
      { requirement_id: "b", met: true, evidence: "ok" } as RequirementResult,
    ]);
    expect(outcome.meets_all_requirements).toBe(false);
    expect(outcome.results.every((r) => r.met === false)).toBe(true);
  });

  it("ignores unknown/extra requirement ids and uses the first verdict per id", () => {
    const outcome = evaluateGate(
      [req("a")],
      [
        verdict({ requirement_id: "a", evidence: "first" }),
        verdict({ requirement_id: "a", evidence: "second" }),
        verdict({ requirement_id: "ghost", evidence: "irrelevant" }),
      ],
    );
    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0].evidence).toBe("first");
  });

  it("vacuously passes when there are no hard requirements", () => {
    const outcome = evaluateGate([], []);
    expect(outcome.meets_all_requirements).toBe(true);
    expect(outcome.results).toEqual([]);
  });

  it("handles number-type requirements structurally (trusts the auditor's comparison, enforces evidence)", () => {
    const reqs = [req("years", "number", 3)];
    const pass = evaluateGate(reqs, [verdict({ requirement_id: "years", evidence: "5 years at Acme" })]);
    expect(pass.meets_all_requirements).toBe(true);
    const fail = evaluateGate(reqs, [verdict({ requirement_id: "years", met: false, evidence: "no duration stated" })]);
    expect(fail.meets_all_requirements).toBe(false);
  });
});

describe("evaluateVerification — independent re-confirmation", () => {
  const reqs = [req("a"), req("b")];
  const passedGate = { meets_all_requirements: true, results: [] };
  const failedGate = { meets_all_requirements: false, results: [] };

  function confirm(id: string, confirmed = true): RequirementVerification {
    return { requirement_id: id, confirmed, note: "re-derived from source" };
  }

  it("verifies only when the gate passed AND every requirement is re-confirmed", () => {
    const outcome = evaluateVerification(reqs, passedGate, [confirm("a"), confirm("b")]);
    expect(outcome.verified).toBe(true);
  });

  it("does not verify if any requirement is not re-confirmed", () => {
    const outcome = evaluateVerification(reqs, passedGate, [confirm("a"), confirm("b", false)]);
    expect(outcome.verified).toBe(false);
  });

  it("does not verify if a confirmation is missing", () => {
    const outcome = evaluateVerification(reqs, passedGate, [confirm("a")]);
    expect(outcome.verified).toBe(false);
  });

  it("can never verify a candidate the gate already failed", () => {
    const outcome = evaluateVerification(reqs, failedGate, [confirm("a"), confirm("b")]);
    expect(outcome.verified).toBe(false);
  });

  it("verifies vacuously when there are no hard requirements and the gate passed", () => {
    const outcome = evaluateVerification([], passedGate, []);
    expect(outcome.verified).toBe(true);
  });
});
