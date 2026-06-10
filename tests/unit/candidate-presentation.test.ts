import { describe, expect, it } from "vitest";
import {
  candidateMatchesFilter,
  candidateVerdict,
  parseCandidateFilter,
  parseCandidateSort,
  parseComparisonIds,
} from "@/lib/applicants/presentation";

describe("candidate presentation rules", () => {
  it("preserves the existing score bands and invited top-pick behavior", () => {
    expect(candidateVerdict({ status: "analyzed", match_score: 92 })).toBe("recommend");
    expect(candidateVerdict({ status: "invited", match_score: 92 })).toBe("recommend");
    expect(candidateVerdict({ status: "analyzed", match_score: 72 })).toBe("review");
    expect(candidateVerdict({ status: "analyzed", match_score: 42 })).toBe("reject");
    expect(candidateVerdict({ status: "invited", match_score: 42 })).toBe("none");
  });

  it("treats requirement mismatch as a visible flag, not an automatic rejection", () => {
    expect(candidateVerdict({ status: "unscored", match_score: null })).toBe("mismatch");
    expect(candidateMatchesFilter({ status: "unscored", match_score: null }, "mismatch")).toBe(true);
    expect(candidateMatchesFilter({ status: "unscored", match_score: null }, "reject")).toBe(false);
  });

  it("limits comparison URL state to three unique candidates", () => {
    expect(parseComparisonIds("a,b,a,c,d")).toEqual(["a", "b", "c"]);
  });

  it("falls back safely for unsupported URL values", () => {
    expect(parseCandidateFilter("automatic-reject")).toBe("all");
    expect(parseCandidateSort("random")).toBe("score");
  });
});

