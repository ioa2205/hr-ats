import { describe, it, expect } from "vitest";
import { jobPostingSchema, hardRequirementSchema } from "@/lib/validations/job";
import { candidateSchema } from "@/lib/validations/applicant";

describe("jobPostingSchema", () => {
  const valid = {
    title: "Senior Developer",
    description: "We are looking for a senior developer with extensive experience.",
  };

  it("accepts valid input with defaults", () => {
    const result = jobPostingSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.required_skills).toEqual([]);
      expect(result.data.hard_requirements).toEqual([]);
      expect(result.data.status).toBe("active");
    }
  });

  it("accepts full input", () => {
    const result = jobPostingSchema.safeParse({
      ...valid,
      required_skills: ["TypeScript", "React"],
      hard_requirements: [
        {
          id: "exp",
          label_ru: "Опыт работы",
          label_uz: "Ish tajribasi",
          type: "number",
          min_value: 3,
          order: 0,
        },
      ],
      status: "closed",
    });
    expect(result.success).toBe(true);
  });

  it("rejects title shorter than 3 chars", () => {
    const result = jobPostingSchema.safeParse({ ...valid, title: "AB" });
    expect(result.success).toBe(false);
  });

  it("rejects description shorter than 20 chars", () => {
    const result = jobPostingSchema.safeParse({ ...valid, description: "Short" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = jobPostingSchema.safeParse({ ...valid, status: "draft" });
    expect(result.success).toBe(false);
  });
});

describe("hardRequirementSchema", () => {
  const valid = {
    id: "education",
    label_ru: "Высшее образование",
    label_uz: "Oliy ma'lumot",
    type: "boolean" as const,
    min_value: null,
    order: 1,
  };

  it("accepts valid hard requirement", () => {
    const result = hardRequirementSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects missing label_uz", () => {
    const { label_uz: _labelUz, ...incomplete } = valid;
    const result = hardRequirementSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("rejects invalid type", () => {
    const result = hardRequirementSchema.safeParse({ ...valid, type: "text" });
    expect(result.success).toBe(false);
  });
});

describe("candidateSchema", () => {
  it("accepts valid Uzbek phone number", () => {
    const result = candidateSchema.safeParse({
      full_name: "Alisher Navoiy",
      phone_number: "+998901234567",
    });
    expect(result.success).toBe(true);
  });

  it("rejects phone without +998 prefix", () => {
    const result = candidateSchema.safeParse({
      full_name: "Test User",
      phone_number: "12345",
    });
    expect(result.success).toBe(false);
  });

  it("rejects phone with wrong digit count", () => {
    const result = candidateSchema.safeParse({
      full_name: "Test User",
      phone_number: "+99890123456",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty full_name", () => {
    const result = candidateSchema.safeParse({
      full_name: "",
      phone_number: "+998901234567",
    });
    expect(result.success).toBe(false);
  });
});
