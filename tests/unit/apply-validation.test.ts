import { describe, it, expect } from "vitest";
import { candidateSchema } from "@/lib/validations/applicant";
import { isRequirementMet, evaluateRequirements } from "@/lib/validations/requirements";
import type { HardRequirement } from "@/types";

// === Phone regex tests ===
describe("phone number validation", () => {
  const phoneRegex = /^\+998\d{9}$/;

  it("accepts valid Uzbek phone +998901234567", () => {
    expect(phoneRegex.test("+998901234567")).toBe(true);
  });

  it("accepts valid phone +998331234567", () => {
    expect(phoneRegex.test("+998331234567")).toBe(true);
  });

  it("rejects phone without + prefix", () => {
    expect(phoneRegex.test("998901234567")).toBe(false);
  });

  it("rejects phone with wrong country code", () => {
    expect(phoneRegex.test("+997901234567")).toBe(false);
  });

  it("rejects phone +9989 (too short — 8 digits after 998)", () => {
    expect(phoneRegex.test("+99890123456")).toBe(false);
  });

  it("rejects phone with 10 digits after 998", () => {
    expect(phoneRegex.test("+9989012345678")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(phoneRegex.test("")).toBe(false);
  });

  it("rejects phone with letters", () => {
    expect(phoneRegex.test("+998abc1234")).toBe(false);
  });

  it("rejects phone with spaces", () => {
    expect(phoneRegex.test("+998 90 123 45 67")).toBe(false);
  });

  it("rejects just +998 (no subscriber digits)", () => {
    expect(phoneRegex.test("+998")).toBe(false);
  });

  it("works through candidateSchema for valid input", () => {
    const result = candidateSchema.safeParse({
      full_name: "Test User",
      phone_number: "+998901234567",
    });
    expect(result.success).toBe(true);
  });

  it("fails in candidateSchema for invalid phone", () => {
    const result = candidateSchema.safeParse({
      full_name: "Test User",
      phone_number: "+99890",
    });
    expect(result.success).toBe(false);
  });
});

// === Hard requirement evaluation ===
// `isRequirementMet` decides whether a single answer meets the threshold.
// `evaluateRequirements` runs the full set and produces the responses map +
// mismatch list. NOTE: a "false" answer here is NOT a submission gate —
// /api/apply still accepts the candidate; the result is used to flag them
// in the HR view and to skip auto-AI.
describe("isRequirementMet", () => {
  describe("boolean requirements", () => {
    const boolReq: HardRequirement = {
      id: "education",
      label_ru: "",
      label_uz: "",
      type: "boolean",
      min_value: null,
      order: 0,
    };

    it("passes when answer is 'true'", () => {
      expect(isRequirementMet(boolReq, "true")).toBe(true);
    });

    it("fails when answer is 'false'", () => {
      expect(isRequirementMet(boolReq, "false")).toBe(false);
    });

    it("fails when answer is empty string", () => {
      expect(isRequirementMet(boolReq, "")).toBe(false);
    });
  });

  describe("number requirements", () => {
    const numReq: HardRequirement = {
      id: "experience",
      label_ru: "",
      label_uz: "",
      type: "number",
      min_value: 3,
      order: 0,
    };

    it("passes when value meets minimum", () => {
      expect(isRequirementMet(numReq, "3")).toBe(true);
    });

    it("passes when value exceeds minimum", () => {
      expect(isRequirementMet(numReq, "10")).toBe(true);
    });

    it("fails when value is below minimum", () => {
      expect(isRequirementMet(numReq, "2")).toBe(false);
    });

    it("fails when value is 0 and minimum is 3", () => {
      expect(isRequirementMet(numReq, "0")).toBe(false);
    });

    it("fails for non-numeric input", () => {
      expect(isRequirementMet(numReq, "abc")).toBe(false);
    });

    it("fails for empty string", () => {
      expect(isRequirementMet(numReq, "")).toBe(false);
    });

    it("passes for number requirement with null min_value (any number accepted)", () => {
      const noMin: HardRequirement = {
        ...numReq,
        id: "age",
        min_value: null,
      };
      expect(isRequirementMet(noMin, "0")).toBe(true);
      expect(isRequirementMet(noMin, "100")).toBe(true);
    });

    it("handles negative values correctly", () => {
      expect(isRequirementMet(numReq, "-1")).toBe(false);
    });

    it("handles float values", () => {
      expect(isRequirementMet(numReq, "3.5")).toBe(true);
    });
  });
});

describe("evaluateRequirements", () => {
  const reqs: HardRequirement[] = [
    {
      id: "exp",
      label_ru: "Опыт",
      label_uz: "Tajriba",
      type: "number",
      min_value: 3,
      order: 0,
    },
    {
      id: "license",
      label_ru: "Права",
      label_uz: "Guvohnoma",
      type: "boolean",
      min_value: null,
      order: 1,
    },
  ];

  it("flags meetsAll=true when every answer satisfies the threshold", () => {
    const result = evaluateRequirements(reqs, { exp: "5", license: "true" });
    expect(result.meetsAll).toBe(true);
    expect(result.mismatchedIds).toEqual([]);
    expect(result.responses).toEqual({ exp: "5", license: "true" });
  });

  it("flags meetsAll=false and lists every mismatched requirement", () => {
    const result = evaluateRequirements(reqs, { exp: "1", license: "false" });
    expect(result.meetsAll).toBe(false);
    expect(result.mismatchedIds.sort()).toEqual(["exp", "license"]);
    // Submission still proceeds — responses are persisted as-is for HR.
    expect(result.responses).toEqual({ exp: "1", license: "false" });
  });

  it("treats missing answers as mismatches (never crashes)", () => {
    const result = evaluateRequirements(reqs, {});
    expect(result.meetsAll).toBe(false);
    expect(result.mismatchedIds.sort()).toEqual(["exp", "license"]);
    expect(result.responses).toEqual({ exp: "", license: "" });
  });

  it("returns meetsAll=true vacuously when there are no requirements", () => {
    const result = evaluateRequirements([], { whatever: "yes" });
    expect(result.meetsAll).toBe(true);
    expect(result.mismatchedIds).toEqual([]);
    expect(result.responses).toEqual({});
  });

  it("coerces non-string values to strings without throwing", () => {
    const result = evaluateRequirements(reqs, {
      exp: 5 as unknown as string,
      license: true as unknown as string,
    });
    expect(result.responses.exp).toBe("5");
    expect(result.responses.license).toBe("true");
    expect(result.meetsAll).toBe(true);
  });
});

// === PDF magic bytes check ===
describe("PDF magic bytes validation", () => {
  const PDF_MAGIC = "%PDF-";

  function validatePdfMagic(headerBytes: string): boolean {
    return headerBytes.startsWith(PDF_MAGIC);
  }

  it("accepts valid PDF header", () => {
    expect(validatePdfMagic("%PDF-1.7")).toBe(true);
  });

  it("accepts PDF 2.0 header", () => {
    expect(validatePdfMagic("%PDF-2.0")).toBe(true);
  });

  it("rejects plain text file", () => {
    expect(validatePdfMagic("Hello")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(validatePdfMagic("")).toBe(false);
  });

  it("rejects PNG header", () => {
    // PNG magic: \x89PNG
    expect(validatePdfMagic("\x89PNG\r")).toBe(false);
  });

  it("rejects file starting with lowercase %pdf", () => {
    expect(validatePdfMagic("%pdf-1.4")).toBe(false);
  });

  it("rejects renamed .txt with generic content", () => {
    expect(validatePdfMagic("This is not a PDF")).toBe(false);
  });
});
