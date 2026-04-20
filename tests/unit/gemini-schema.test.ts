import { describe, it, expect } from "vitest";
import { AnalysisZod } from "@/lib/gemini/schema";
import { calcCost } from "@/lib/gemini/cost";

// ---------------------------------------------------------------------------
// Valid fixture — trilingual analysis
// ---------------------------------------------------------------------------
const VALID_ANALYSIS = {
  match_score: 72,
  language_detected: "ru" as const,
  one_line_summary_ru: "Опытный фронтенд-разработчик с 3+ лет React опыта",
  one_line_summary_uz: "3+ yillik React tajribasiga ega frontend-dasturchi",
  one_line_summary_en: "Experienced frontend developer with 3+ years of React",
  strengths_ru: [
    "3 года коммерческой разработки React в Epam (2022-2025)",
    "Опыт TypeScript и Next.js",
  ],
  strengths_uz: [
    "Epam kompaniyasida 3 yillik React tajribasi (2022-2025)",
    "TypeScript va Next.js bo'yicha tajriba",
  ],
  strengths_en: [
    "3 years of commercial React development at Epam (2022-2025)",
    "Experience with TypeScript and Next.js",
  ],
  gaps_ru: ["Нет опыта с Python/ML"],
  gaps_uz: ["Python/ML tajribasi yo'q"],
  gaps_en: ["No experience with Python/ML"],
};

// ---------------------------------------------------------------------------
// AnalysisZod — valid inputs
// ---------------------------------------------------------------------------
describe("AnalysisZod", () => {
  it("accepts a valid analysis object", () => {
    const result = AnalysisZod.safeParse(VALID_ANALYSIS);
    expect(result.success).toBe(true);
  });

  it("accepts min strengths (1 per locale) and zero gaps", () => {
    const result = AnalysisZod.safeParse({
      ...VALID_ANALYSIS,
      strengths_ru: ["Минимальное достоинство"],
      strengths_uz: ["Minimal afzallik"],
      strengths_en: ["Minimal strength"],
      gaps_ru: [],
      gaps_uz: [],
      gaps_en: [],
    });
    expect(result.success).toBe(true);
  });

  it("accepts match_score boundaries", () => {
    for (const score of [0, 100]) {
      const result = AnalysisZod.safeParse({ ...VALID_ANALYSIS, match_score: score });
      expect(result.success).toBe(true);
    }
  });

  it("accepts all language_detected values", () => {
    for (const lang of ["uz", "ru", "en", "other"] as const) {
      const result = AnalysisZod.safeParse({
        ...VALID_ANALYSIS,
        language_detected: lang,
      });
      expect(result.success).toBe(true);
    }
  });

  // ---------------------------------------------------------------------------
  // AnalysisZod — invalid inputs
  // ---------------------------------------------------------------------------
  it("rejects match_score outside 0-100", () => {
    for (const score of [-1, 101]) {
      const result = AnalysisZod.safeParse({ ...VALID_ANALYSIS, match_score: score });
      expect(result.success).toBe(false);
    }
  });

  it("rejects non-integer match_score", () => {
    const result = AnalysisZod.safeParse({ ...VALID_ANALYSIS, match_score: 72.5 });
    expect(result.success).toBe(false);
  });

  it("rejects one_line_summary_ru over 150 chars", () => {
    const result = AnalysisZod.safeParse({
      ...VALID_ANALYSIS,
      one_line_summary_ru: "x".repeat(151),
    });
    expect(result.success).toBe(false);
  });

  it("rejects one_line_summary_uz over 180 chars", () => {
    const result = AnalysisZod.safeParse({
      ...VALID_ANALYSIS,
      one_line_summary_uz: "x".repeat(181),
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty strengths_ru", () => {
    const result = AnalysisZod.safeParse({ ...VALID_ANALYSIS, strengths_ru: [] });
    expect(result.success).toBe(false);
  });

  it("rejects missing trilingual fields", () => {
    const partial = { ...VALID_ANALYSIS } as Record<string, unknown>;
    delete partial.strengths_en;
    const result = AnalysisZod.safeParse(partial);
    expect(result.success).toBe(false);
  });

  it("rejects invalid language_detected", () => {
    const result = AnalysisZod.safeParse({ ...VALID_ANALYSIS, language_detected: "fr" });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calcCost
// ---------------------------------------------------------------------------
describe("calcCost", () => {
  it("returns 0 for 0 tokens", () => {
    expect(calcCost(0, 0)).toBe(0);
  });

  it("calculates correctly for 1M input tokens only", () => {
    expect(calcCost(1_000_000, 0)).toBeCloseTo(2.0, 6);
  });

  it("calculates correctly for 1M output tokens only", () => {
    expect(calcCost(0, 1_000_000)).toBeCloseTo(12.0, 6);
  });

  it("calculates correctly for mixed token counts", () => {
    expect(calcCost(5000, 1000)).toBeCloseTo(0.022, 6);
  });

  it("handles typical Gemini usage (10k prompt, 500 output)", () => {
    expect(calcCost(10000, 500)).toBeCloseTo(0.026, 6);
  });
});
