import { describe, it, expect } from "vitest";

/**
 * Tests the candidate ranking logic used for display ordering.
 * status_rank: analyzed/invited (0) → pending/analyzing (1) → failed (2) → others (3)
 * Within same rank: higher match_score first, then older created_at first.
 */

type CandidateStatus =
  | "pending_analysis"
  | "analyzing"
  | "analyzed"
  | "analysis_failed"
  | "invited"
  | "rejected"
  | "rejected_screening";

function statusRank(status: CandidateStatus): number {
  switch (status) {
    case "analyzed":
    case "invited":
      return 0;
    case "analyzing":
    case "pending_analysis":
      return 1;
    case "analysis_failed":
      return 2;
    default:
      return 3;
  }
}

interface RankableCandidate {
  id: string;
  status: CandidateStatus;
  match_score: number | null;
  created_at: string;
}

function sortCandidates(candidates: RankableCandidate[]): RankableCandidate[] {
  return [...candidates].sort((a, b) => {
    // 1. status_rank ASC
    const rankDiff = statusRank(a.status) - statusRank(b.status);
    if (rankDiff !== 0) return rankDiff;

    // 2. match_score DESC NULLS LAST
    const scoreA = a.match_score ?? -1;
    const scoreB = b.match_score ?? -1;
    if (scoreA !== scoreB) return scoreB - scoreA;

    // 3. created_at ASC
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

describe("candidate ranking", () => {
  it("ranks analyzed before pending", () => {
    const candidates: RankableCandidate[] = [
      {
        id: "1",
        status: "pending_analysis",
        match_score: null,
        created_at: "2026-04-01T00:00:00Z",
      },
      { id: "2", status: "analyzed", match_score: 80, created_at: "2026-04-02T00:00:00Z" },
    ];
    const sorted = sortCandidates(candidates);
    expect(sorted[0].id).toBe("2"); // analyzed first
    expect(sorted[1].id).toBe("1"); // pending second
  });

  it("ranks invited at same level as analyzed", () => {
    const candidates: RankableCandidate[] = [
      { id: "1", status: "invited", match_score: 75, created_at: "2026-04-01T00:00:00Z" },
      { id: "2", status: "analyzed", match_score: 80, created_at: "2026-04-02T00:00:00Z" },
    ];
    const sorted = sortCandidates(candidates);
    // Both rank 0, but analyzed has higher score
    expect(sorted[0].id).toBe("2");
    expect(sorted[1].id).toBe("1");
  });

  it("ranks analyzing before failed", () => {
    const candidates: RankableCandidate[] = [
      { id: "1", status: "analysis_failed", match_score: null, created_at: "2026-04-01T00:00:00Z" },
      { id: "2", status: "analyzing", match_score: null, created_at: "2026-04-02T00:00:00Z" },
    ];
    const sorted = sortCandidates(candidates);
    expect(sorted[0].id).toBe("2"); // analyzing (rank 1) before failed (rank 2)
    expect(sorted[1].id).toBe("1");
  });

  it("ranks failed before screened out", () => {
    const candidates: RankableCandidate[] = [
      {
        id: "1",
        status: "rejected_screening",
        match_score: null,
        created_at: "2026-04-01T00:00:00Z",
      },
      { id: "2", status: "analysis_failed", match_score: null, created_at: "2026-04-02T00:00:00Z" },
    ];
    const sorted = sortCandidates(candidates);
    expect(sorted[0].id).toBe("2"); // failed (rank 2) before screened (rank 3)
    expect(sorted[1].id).toBe("1");
  });

  it("sorts by score DESC within same rank", () => {
    const candidates: RankableCandidate[] = [
      { id: "1", status: "analyzed", match_score: 60, created_at: "2026-04-01T00:00:00Z" },
      { id: "2", status: "analyzed", match_score: 90, created_at: "2026-04-02T00:00:00Z" },
      { id: "3", status: "analyzed", match_score: 75, created_at: "2026-04-03T00:00:00Z" },
    ];
    const sorted = sortCandidates(candidates);
    expect(sorted.map((c) => c.id)).toEqual(["2", "3", "1"]);
  });

  it("treats null scores as lowest", () => {
    const candidates: RankableCandidate[] = [
      { id: "1", status: "analyzed", match_score: null, created_at: "2026-04-01T00:00:00Z" },
      { id: "2", status: "analyzed", match_score: 30, created_at: "2026-04-02T00:00:00Z" },
    ];
    const sorted = sortCandidates(candidates);
    expect(sorted[0].id).toBe("2"); // 30 beats null
    expect(sorted[1].id).toBe("1");
  });

  it("sorts by created_at ASC as tiebreaker", () => {
    const candidates: RankableCandidate[] = [
      { id: "1", status: "analyzed", match_score: 80, created_at: "2026-04-03T00:00:00Z" },
      { id: "2", status: "analyzed", match_score: 80, created_at: "2026-04-01T00:00:00Z" },
    ];
    const sorted = sortCandidates(candidates);
    expect(sorted[0].id).toBe("2"); // earlier created_at wins
    expect(sorted[1].id).toBe("1");
  });

  it("correctly orders a mixed set of all statuses", () => {
    const candidates: RankableCandidate[] = [
      {
        id: "screened",
        status: "rejected_screening",
        match_score: null,
        created_at: "2026-04-01T00:00:00Z",
      },
      {
        id: "pending",
        status: "pending_analysis",
        match_score: null,
        created_at: "2026-04-02T00:00:00Z",
      },
      {
        id: "failed",
        status: "analysis_failed",
        match_score: null,
        created_at: "2026-04-03T00:00:00Z",
      },
      {
        id: "analyzed-low",
        status: "analyzed",
        match_score: 40,
        created_at: "2026-04-04T00:00:00Z",
      },
      { id: "invited", status: "invited", match_score: 90, created_at: "2026-04-05T00:00:00Z" },
      {
        id: "analyzed-high",
        status: "analyzed",
        match_score: 85,
        created_at: "2026-04-06T00:00:00Z",
      },
      {
        id: "analyzing",
        status: "analyzing",
        match_score: null,
        created_at: "2026-04-07T00:00:00Z",
      },
    ];
    const sorted = sortCandidates(candidates);
    expect(sorted.map((c) => c.id)).toEqual([
      "invited", // rank 0, score 90
      "analyzed-high", // rank 0, score 85
      "analyzed-low", // rank 0, score 40
      "pending", // rank 1
      "analyzing", // rank 1 (after pending by date)
      "failed", // rank 2
      "screened", // rank 3
    ]);
  });

  describe("statusRank function", () => {
    it("assigns rank 0 to analyzed", () => {
      expect(statusRank("analyzed")).toBe(0);
    });

    it("assigns rank 0 to invited", () => {
      expect(statusRank("invited")).toBe(0);
    });

    it("assigns rank 1 to analyzing", () => {
      expect(statusRank("analyzing")).toBe(1);
    });

    it("assigns rank 1 to pending_analysis", () => {
      expect(statusRank("pending_analysis")).toBe(1);
    });

    it("assigns rank 2 to analysis_failed", () => {
      expect(statusRank("analysis_failed")).toBe(2);
    });

    it("assigns rank 3 to rejected_screening", () => {
      expect(statusRank("rejected_screening")).toBe(3);
    });

    it("assigns rank 3 to rejected", () => {
      expect(statusRank("rejected")).toBe(3);
    });
  });
});
