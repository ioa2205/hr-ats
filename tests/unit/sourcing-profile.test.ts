import { describe, it, expect } from "vitest";
import type { HardRequirement } from "@/types";
import {
  buildRequirementProfile,
  seedRequirementProfile,
} from "@/lib/sourcing/requirement-profile";
import { SCORE_AXIS_WEIGHTS, computeDeepScore } from "@/lib/sourcing/scoring";
import { parseGeminiJson, SourcingParseError } from "@/lib/sourcing/parse";
import { GateResultsZod, ProfileExtractionZod, type ScoreResultRaw } from "@/lib/sourcing/schema";
import type { RequirementProfileExtraction } from "@/lib/sourcing/types";

const reqs: HardRequirement[] = [
  { id: "r1", label_ru: "Права", label_uz: "Guvohnoma", type: "boolean", min_value: null, order: 0 },
  { id: "r2", label_ru: "Опыт", label_uz: "Tajriba", type: "number", min_value: 3, order: 1 },
];

const extraction: RequirementProfileExtraction = {
  must_haves: [{ text: "React", weight: 5 }],
  nice_to_haves: [{ text: "GraphQL", weight: 2 }],
  seniority: "Senior",
  required_languages: [{ language: "ru", level: "fluent" }],
  search_keywords: ["frontend", "react developer"],
};

describe("seedRequirementProfile", () => {
  it("passes the hard requirements through verbatim and defaults location to null", () => {
    const seed = seedRequirementProfile({
      title: "Frontend Dev",
      description: "Build the web app.",
      required_skills: ["React"],
      hard_requirements: reqs,
    });
    expect(seed.hard_requirements).toBe(reqs);
    expect(seed.location).toBeNull();
    expect(seed.title).toBe("Frontend Dev");
  });
});

describe("buildRequirementProfile", () => {
  it("merges seed + extraction and keeps the gate untouched", () => {
    const profile = buildRequirementProfile(
      { title: "Frontend Dev", description: "Build the web app.", required_skills: ["React"], hard_requirements: reqs },
      extraction,
    );
    expect(profile.hard_requirements).toEqual(reqs);
    expect(profile.must_haves).toEqual(extraction.must_haves);
    expect(profile.seniority).toBe("Senior");
    expect(profile.search_keywords).toContain("react developer");
  });

  it("maps an empty seniority to null (no guessing)", () => {
    const profile = buildRequirementProfile(
      { title: "X", description: "Y", required_skills: [], hard_requirements: [] },
      { ...extraction, seniority: "   " },
    );
    expect(profile.seniority).toBeNull();
  });
});

describe("computeDeepScore", () => {
  it("uses weights that sum to exactly 1.0", () => {
    const sum = Object.values(SCORE_AXIS_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.0, 10);
  });

  function axis(score: number) {
    return { score, evidence: "quote" };
  }

  it("computes a 100 total when every axis is 100", () => {
    const raw: ScoreResultRaw = {
      skills_match: axis(100),
      experience_relevance: axis(100),
      seniority_fit: axis(100),
      language_fit: axis(100),
      recency_activity: axis(100),
      nice_to_haves_covered: axis(100),
      gaps: [],
      risks: [],
      confidence: 0.9,
    };
    expect(computeDeepScore(raw).total).toBeCloseTo(100, 6);
  });

  it("weights skills_match at 0.30 of the total", () => {
    const raw: ScoreResultRaw = {
      skills_match: axis(100),
      experience_relevance: axis(0),
      seniority_fit: axis(0),
      language_fit: axis(0),
      recency_activity: axis(0),
      nice_to_haves_covered: axis(0),
      gaps: ["no leadership evidence"],
      risks: ["employed"],
      confidence: 0.7,
    };
    const score = computeDeepScore(raw);
    expect(score.total).toBeCloseTo(30, 6);
    expect(score.axes).toHaveLength(6);
    expect(score.gaps).toEqual(["no leadership evidence"]);
    expect(score.risks).toEqual(["employed"]);
  });
});

describe("parseGeminiJson", () => {
  it("throws invalid_json on non-JSON", () => {
    try {
      parseGeminiJson("not json", ProfileExtractionZod, "extraction");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(SourcingParseError);
      expect((err as SourcingParseError).code).toBe("invalid_json");
    }
  });

  it("throws schema_mismatch when the shape is wrong", () => {
    try {
      parseGeminiJson(JSON.stringify({ requirements: "nope" }), GateResultsZod, "gate");
      expect.unreachable();
    } catch (err) {
      expect((err as SourcingParseError).code).toBe("schema_mismatch");
    }
  });

  it("returns the validated value on a good payload", () => {
    const value = parseGeminiJson(
      JSON.stringify({ requirements: [{ requirement_id: "r1", met: true, evidence: "x", confidence: 0.9 }] }),
      GateResultsZod,
      "gate",
    );
    expect(value.requirements[0].requirement_id).toBe("r1");
  });

  it("rejects a gate confidence outside 0..1", () => {
    expect(() =>
      parseGeminiJson(
        JSON.stringify({ requirements: [{ requirement_id: "r1", met: true, evidence: "x", confidence: 9 }] }),
        GateResultsZod,
        "gate",
      ),
    ).toThrow(SourcingParseError);
  });
});
