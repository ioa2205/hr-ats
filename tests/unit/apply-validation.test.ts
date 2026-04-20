import { describe, it, expect } from "vitest";
import { candidateSchema } from "@/lib/validations/applicant";

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

// === Hard requirement validation ===
describe("hard requirement validation", () => {
  interface HardRequirement {
    id: string;
    type: "boolean" | "number";
    min_value: number | null;
  }

  function validateRequirement(req: HardRequirement, answer: string | undefined): boolean {
    if (req.type === "boolean") {
      return answer === "true";
    }
    if (req.type === "number") {
      const num = Number(answer);
      if (!answer || isNaN(num)) return false;
      if (req.min_value !== null && num < req.min_value) return false;
      return true;
    }
    return false;
  }

  describe("boolean requirements", () => {
    const boolReq: HardRequirement = {
      id: "education",
      type: "boolean",
      min_value: null,
    };

    it("passes when answer is 'true'", () => {
      expect(validateRequirement(boolReq, "true")).toBe(true);
    });

    it("fails when answer is 'false'", () => {
      expect(validateRequirement(boolReq, "false")).toBe(false);
    });

    it("fails when answer is undefined", () => {
      expect(validateRequirement(boolReq, undefined)).toBe(false);
    });

    it("fails when answer is empty string", () => {
      expect(validateRequirement(boolReq, "")).toBe(false);
    });
  });

  describe("number requirements", () => {
    const numReq: HardRequirement = {
      id: "experience",
      type: "number",
      min_value: 3,
    };

    it("passes when value meets minimum", () => {
      expect(validateRequirement(numReq, "3")).toBe(true);
    });

    it("passes when value exceeds minimum", () => {
      expect(validateRequirement(numReq, "10")).toBe(true);
    });

    it("fails when value is below minimum", () => {
      expect(validateRequirement(numReq, "2")).toBe(false);
    });

    it("fails when value is 0 and minimum is 3", () => {
      expect(validateRequirement(numReq, "0")).toBe(false);
    });

    it("fails for non-numeric input", () => {
      expect(validateRequirement(numReq, "abc")).toBe(false);
    });

    it("fails for empty string", () => {
      expect(validateRequirement(numReq, "")).toBe(false);
    });

    it("fails for undefined", () => {
      expect(validateRequirement(numReq, undefined)).toBe(false);
    });

    it("passes for number requirement with null min_value (any number accepted)", () => {
      const noMin: HardRequirement = {
        id: "age",
        type: "number",
        min_value: null,
      };
      expect(validateRequirement(noMin, "0")).toBe(true);
      expect(validateRequirement(noMin, "100")).toBe(true);
    });

    it("handles negative values correctly", () => {
      expect(validateRequirement(numReq, "-1")).toBe(false);
    });

    it("handles float values", () => {
      expect(validateRequirement(numReq, "3.5")).toBe(true);
    });
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
