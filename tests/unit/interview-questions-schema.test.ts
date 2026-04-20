import { describe, expect, it } from "vitest";
import {
  InterviewQuestionsResponseZod,
  parseStoredInterviewQuestions,
  QUESTION_FOCUSES,
} from "@/lib/gemini/interview-questions";

function makeItem(focus: (typeof QUESTION_FOCUSES)[number] = "strength_probe") {
  return {
    question: "Walk me through a production RAG system you shipped end-to-end.",
    rationale: "CV claims 2 years of LangChain in production at Epam.",
    focus,
  };
}

function makeArray(n: number, focus: (typeof QUESTION_FOCUSES)[number] = "strength_probe") {
  return Array.from({ length: n }, () => makeItem(focus));
}

describe("InterviewQuestionsResponseZod", () => {
  it("accepts a valid 5-item-per-locale fixture", () => {
    const ok = {
      ru: makeArray(5),
      uz: makeArray(5),
      en: makeArray(5),
    };
    expect(InterviewQuestionsResponseZod.safeParse(ok).success).toBe(true);
  });

  it("accepts the maximum 7 items per locale", () => {
    const ok = {
      ru: makeArray(7),
      uz: makeArray(7),
      en: makeArray(7),
    };
    expect(InterviewQuestionsResponseZod.safeParse(ok).success).toBe(true);
  });

  it("rejects fewer than 5 items in any locale", () => {
    const bad = { ru: makeArray(4), uz: makeArray(5), en: makeArray(5) };
    expect(InterviewQuestionsResponseZod.safeParse(bad).success).toBe(false);
  });

  it("rejects more than 7 items in any locale", () => {
    const bad = { ru: makeArray(5), uz: makeArray(8), en: makeArray(5) };
    expect(InterviewQuestionsResponseZod.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown focus values", () => {
    const bad = {
      ru: [...makeArray(4), { ...makeItem(), focus: "small_talk" }],
      uz: makeArray(5),
      en: makeArray(5),
    };
    expect(InterviewQuestionsResponseZod.safeParse(bad).success).toBe(false);
  });

  it("rejects an empty question string", () => {
    const bad = {
      ru: [...makeArray(4), { ...makeItem(), question: "" }],
      uz: makeArray(5),
      en: makeArray(5),
    };
    expect(InterviewQuestionsResponseZod.safeParse(bad).success).toBe(false);
  });

  it("rejects a question longer than 240 characters", () => {
    const longQ = "x".repeat(241);
    const bad = {
      ru: [...makeArray(4), { ...makeItem(), question: longQ }],
      uz: makeArray(5),
      en: makeArray(5),
    };
    expect(InterviewQuestionsResponseZod.safeParse(bad).success).toBe(false);
  });

  it("rejects a rationale longer than 200 characters", () => {
    const longR = "x".repeat(201);
    const bad = {
      ru: [...makeArray(4), { ...makeItem(), rationale: longR }],
      uz: makeArray(5),
      en: makeArray(5),
    };
    expect(InterviewQuestionsResponseZod.safeParse(bad).success).toBe(false);
  });

  it("rejects when a locale is missing", () => {
    const bad = { ru: makeArray(5), uz: makeArray(5) };
    expect(InterviewQuestionsResponseZod.safeParse(bad).success).toBe(false);
  });
});

describe("parseStoredInterviewQuestions", () => {
  it("returns null for null/undefined", () => {
    expect(parseStoredInterviewQuestions(null)).toBeNull();
    expect(parseStoredInterviewQuestions(undefined)).toBeNull();
  });

  it("returns null for objects missing generated_at", () => {
    const blob = {
      model: "gemini-3.1-pro-preview",
      ru: makeArray(5),
      uz: makeArray(5),
      en: makeArray(5),
    };
    expect(parseStoredInterviewQuestions(blob)).toBeNull();
  });

  it("parses a complete blob", () => {
    const blob = {
      generated_at: "2026-04-19T12:34:56.789Z",
      model: "gemini-3.1-pro-preview",
      ru: makeArray(5),
      uz: makeArray(5),
      en: makeArray(5),
    };
    const parsed = parseStoredInterviewQuestions(blob);
    expect(parsed).not.toBeNull();
    expect(parsed?.ru).toHaveLength(5);
    expect(parsed?.model).toBe("gemini-3.1-pro-preview");
  });
});
