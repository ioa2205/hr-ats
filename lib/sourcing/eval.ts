/**
 * Pure types + comparator for the golden-set matching-quality eval. The eval
 * runner (tests/eval/golden.eval.test.ts) drives the real Gemini funnel stages
 * against hand-labeled fixtures; this module holds the deterministic assertion
 * logic so it can be unit-tested offline. NOT part of the CI test run — see
 * `pnpm eval` (vitest.eval.config.ts) and SOURCING_RUNBOOK §Eval.
 */
import type { HardRequirement } from "@/types";
import type { NormalizedProfile, RequirementProfile } from "./types";

export interface GoldenFixture {
  name: string;
  candidate: NormalizedProfile;
  hard_requirements: HardRequirement[];
  role_profile: RequirementProfile;
  expected: {
    gate_pass: boolean;
    /** asserted only when present; minimum acceptable weighted fit (0–100). */
    score_gte?: number;
    /** asserted only when present; independent verification verdict. */
    verify_pass?: boolean;
  };
}

export interface FixtureActual {
  gate_pass: boolean;
  /** null when the gate did not pass, so verify/score were not run. */
  verify_pass: boolean | null;
  score_total: number | null;
}

export interface FixtureComparison {
  name: string;
  ok: boolean;
  mismatches: string[];
}

/** Compares an actual funnel outcome against a fixture's expectations. */
export function compareFixture(
  name: string,
  expected: GoldenFixture["expected"],
  actual: FixtureActual,
): FixtureComparison {
  const mismatches: string[] = [];

  if (actual.gate_pass !== expected.gate_pass) {
    mismatches.push(`gate_pass: expected ${expected.gate_pass}, got ${actual.gate_pass}`);
  }

  if (expected.verify_pass !== undefined && actual.verify_pass !== expected.verify_pass) {
    mismatches.push(
      `verify_pass: expected ${expected.verify_pass}, got ${String(actual.verify_pass)}`,
    );
  }

  if (expected.score_gte !== undefined) {
    if (actual.score_total === null) {
      mismatches.push(
        `score_gte: expected >= ${expected.score_gte}, but no score (gate did not pass)`,
      );
    } else if (actual.score_total < expected.score_gte) {
      mismatches.push(`score_gte: expected >= ${expected.score_gte}, got ${actual.score_total}`);
    }
  }

  return { name, ok: mismatches.length === 0, mismatches };
}
