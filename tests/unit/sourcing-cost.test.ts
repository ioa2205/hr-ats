import { describe, it, expect } from "vitest";
import {
  INPUT_USD_PER_MTOK,
  OUTPUT_USD_PER_MTOK,
  INPUT_USD_PER_MTOK_FLASH,
  OUTPUT_USD_PER_MTOK_FLASH,
} from "@/lib/gemini/client";
import {
  PRO_INPUT_USD_PER_MTOK,
  PRO_OUTPUT_USD_PER_MTOK,
  FLASH_INPUT_USD_PER_MTOK,
  FLASH_OUTPUT_USD_PER_MTOK,
} from "@/lib/sourcing/pricing";
import { ZERO_COST, addUsage, calcCostForTier } from "@/lib/sourcing/cost";
import { rankAndShortlist } from "@/lib/sourcing/rank";

describe("sourcing pricing stays in sync with lib/gemini/client (drift guard)", () => {
  it("Pro + Flash rates match the canonical Gemini client constants", () => {
    expect(PRO_INPUT_USD_PER_MTOK).toBe(INPUT_USD_PER_MTOK);
    expect(PRO_OUTPUT_USD_PER_MTOK).toBe(OUTPUT_USD_PER_MTOK);
    expect(FLASH_INPUT_USD_PER_MTOK).toBe(INPUT_USD_PER_MTOK_FLASH);
    expect(FLASH_OUTPUT_USD_PER_MTOK).toBe(OUTPUT_USD_PER_MTOK_FLASH);
  });
});

describe("calcCostForTier", () => {
  it("prices Pro using Pro rates", () => {
    expect(calcCostForTier("pro", 1_000_000, 1_000_000)).toBeCloseTo(
      INPUT_USD_PER_MTOK + OUTPUT_USD_PER_MTOK,
      10,
    );
  });

  it("prices Flash using the much cheaper Flash rates (not Pro)", () => {
    expect(calcCostForTier("flash", 1_000_000, 1_000_000)).toBeCloseTo(
      INPUT_USD_PER_MTOK_FLASH + OUTPUT_USD_PER_MTOK_FLASH,
      10,
    );
    // a Flash call must cost strictly less than the same tokens at Pro rates.
    expect(calcCostForTier("flash", 500_000, 500_000)).toBeLessThan(
      calcCostForTier("pro", 500_000, 500_000),
    );
  });
});

describe("addUsage accumulation", () => {
  it("sums token counts and tier-aware cost across calls", () => {
    let acc = ZERO_COST;
    acc = addUsage(acc, "pro", { promptTokens: 1000, outputTokens: 500 });
    acc = addUsage(acc, "flash", { promptTokens: 2000, outputTokens: 800 });
    expect(acc.inputTokens).toBe(3000);
    expect(acc.outputTokens).toBe(1300);
    const expected =
      calcCostForTier("pro", 1000, 500) + calcCostForTier("flash", 2000, 800);
    expect(acc.costUsd).toBeCloseTo(expected, 12);
  });

  it("treats null usage (e.g. Flash with no usageMetadata) as zero, never inventing tokens", () => {
    let acc = ZERO_COST;
    acc = addUsage(acc, "flash", { promptTokens: null, outputTokens: null });
    expect(acc).toEqual(ZERO_COST);
  });
});

describe("rankAndShortlist", () => {
  it("sorts by score desc, breaks ties by identity_key, and assigns 1-based ranks", () => {
    const ranked = rankAndShortlist(
      [
        { identity_key: "b", score: 80 },
        { identity_key: "a", score: 80 },
        { identity_key: "c", score: 95 },
      ],
      10,
    );
    expect(ranked.map((r) => r.identity_key)).toEqual(["c", "a", "b"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });

  it("never pads beyond the available entries", () => {
    const ranked = rankAndShortlist([{ identity_key: "a", score: 50 }], 20);
    expect(ranked).toHaveLength(1);
  });

  it("caps at the requested size", () => {
    const entries = Array.from({ length: 30 }, (_, i) => ({
      identity_key: `k${i}`,
      score: i,
    }));
    const ranked = rankAndShortlist(entries, 20);
    expect(ranked).toHaveLength(20);
    expect(ranked[0].score).toBe(29);
  });
});
