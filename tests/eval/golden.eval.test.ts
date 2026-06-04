/**
 * Golden-set matching-quality eval. Drives the REAL Gemini funnel stages
 * (gate → verify + score) against hand-labeled fixtures and asserts the
 * outcomes match. Opt-in only — NOT in the CI `pnpm test` run (see
 * vitest.eval.config.ts). Run with a real key:
 *
 *   GOOGLE_GEMINI_API_KEY=... pnpm eval
 *
 * Without the key it reports as skipped (never stubs the model). Use it to
 * catch quality regressions before changing prompts, models, or thresholds.
 */
import { describe, it, expect } from "vitest";
import fixtures from "../fixtures/golden-candidates.json";
import { createGeminiFunnelMethods } from "@/lib/sourcing/gemini";
import { evaluateGate, evaluateVerification } from "@/lib/sourcing/gate";
import { computeDeepScore } from "@/lib/sourcing/scoring";
import { compareFixture, type GoldenFixture, type FixtureActual } from "@/lib/sourcing/eval";

const golden = fixtures as unknown as GoldenFixture[];
const hasKey = Boolean(process.env.GOOGLE_GEMINI_API_KEY);

describe.skipIf(!hasKey)("golden-set matching quality", () => {
  const methods = createGeminiFunnelMethods();

  for (const fx of golden) {
    it(
      fx.name,
      async () => {
        const gateRaw = await methods.runGate(fx.candidate, fx.hard_requirements);
        const gate = evaluateGate(fx.hard_requirements, gateRaw.data.requirements);

        let verifyPass: boolean | null = null;
        let scoreTotal: number | null = null;

        if (gate.meets_all_requirements) {
          const [verifyRaw, scoreRaw] = await Promise.all([
            methods.runVerify(fx.candidate, fx.hard_requirements, gate.results),
            methods.runScore(fx.candidate, fx.role_profile),
          ]);
          verifyPass = evaluateVerification(
            fx.hard_requirements,
            gate,
            verifyRaw.data.requirements,
          ).verified;
          scoreTotal = computeDeepScore(scoreRaw.data).total;
        }

        const actual: FixtureActual = {
          gate_pass: gate.meets_all_requirements,
          verify_pass: verifyPass,
          score_total: scoreTotal,
        };
        const cmp = compareFixture(fx.name, fx.expected, actual);
        expect(cmp.mismatches, cmp.mismatches.join("; ")).toEqual([]);
      },
      120_000,
    );
  }
});
