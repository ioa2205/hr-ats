import { describe, it, expect } from "vitest";
import {
  jobPostingSchema,
  hardRequirementSchema,
  openQuestionSchema,
} from "@/lib/validations/job";

describe("jobPostingSchema — create payload validation", () => {
  const validPayload = {
    title: "Senior Frontend Developer",
    description: "We are looking for an experienced frontend developer to join our team.",
    required_skills: ["TypeScript", "React", "Next.js"],
    hard_requirements: [
      {
        id: "exp",
        label_ru: "Опыт работы",
        label_uz: "Ish tajribasi",
        type: "number" as const,
        min_value: 3,
        order: 0,
      },
      {
        id: "edu",
        label_ru: "Высшее образование",
        label_uz: "Oliy ma'lumot",
        type: "boolean" as const,
        min_value: null,
        order: 1,
      },
    ],
    status: "active" as const,
  };

  it("accepts a complete valid payload", () => {
    const result = jobPostingSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Senior Frontend Developer");
      expect(result.data.required_skills).toHaveLength(3);
      expect(result.data.hard_requirements).toHaveLength(2);
    }
  });

  it("accepts minimal payload (title + description only)", () => {
    const result = jobPostingSchema.safeParse({
      title: "Junior Dev",
      description: "Entry-level position for aspiring developers.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.required_skills).toEqual([]);
      expect(result.data.hard_requirements).toEqual([]);
      expect(result.data.status).toBe("active");
    }
  });

  it("rejects title shorter than 3 characters", () => {
    const result = jobPostingSchema.safeParse({
      ...validPayload,
      title: "AB",
    });
    expect(result.success).toBe(false);
  });

  it("rejects description shorter than 20 characters", () => {
    const result = jobPostingSchema.safeParse({
      ...validPayload,
      description: "Too short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty skill strings", () => {
    const result = jobPostingSchema.safeParse({
      ...validPayload,
      required_skills: ["React", ""],
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const result = jobPostingSchema.safeParse({
      ...validPayload,
      status: "draft",
    });
    expect(result.success).toBe(false);
  });

  it("defaults optional_questions and open_questions to empty arrays", () => {
    const result = jobPostingSchema.safeParse({
      title: "Junior Dev",
      description: "Entry-level position for aspiring developers.",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optional_questions).toEqual([]);
      expect(result.data.open_questions).toEqual([]);
    }
  });

  it("accepts optional_questions (hard-requirement shaped) and open_questions", () => {
    const result = jobPostingSchema.safeParse({
      ...validPayload,
      optional_questions: [
        {
          id: "relocate",
          label_ru: "Готовы к переезду?",
          label_uz: "Ko'chishga tayyormisiz?",
          type: "boolean" as const,
          min_value: null,
          order: 0,
        },
      ],
      open_questions: [
        {
          id: "why",
          prompt_ru: "Почему вы хотите эту работу?",
          prompt_uz: "Nega bu ishni xohlaysiz?",
          order: 0,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optional_questions).toHaveLength(1);
      expect(result.data.open_questions).toHaveLength(1);
    }
  });
});

describe("openQuestionSchema — shape validation", () => {
  const validOpen = {
    id: "why",
    prompt_ru: "Почему вы хотите эту работу?",
    prompt_uz: "Nega bu ishni xohlaysiz?",
    order: 0,
  };

  it("accepts a valid open question (en prompt optional)", () => {
    expect(openQuestionSchema.safeParse(validOpen).success).toBe(true);
  });

  it("rejects a blank required prompt locale", () => {
    expect(openQuestionSchema.safeParse({ ...validOpen, prompt_ru: "" }).success).toBe(false);
  });

  it("rejects a missing uz prompt", () => {
    const { prompt_uz: _omit, ...incomplete } = validOpen;
    expect(openQuestionSchema.safeParse(incomplete).success).toBe(false);
  });
});

describe("hardRequirementSchema — shape validation", () => {
  const validBoolReq = {
    id: "edu",
    label_ru: "Высшее образование",
    label_uz: "Oliy ma'lumot",
    type: "boolean" as const,
    min_value: null,
    order: 0,
  };

  const validNumberReq = {
    id: "exp",
    label_ru: "Опыт работы (лет)",
    label_uz: "Ish tajribasi (yil)",
    type: "number" as const,
    min_value: 3,
    order: 1,
  };

  it("accepts valid boolean requirement", () => {
    const result = hardRequirementSchema.safeParse(validBoolReq);
    expect(result.success).toBe(true);
  });

  it("accepts valid number requirement", () => {
    const result = hardRequirementSchema.safeParse(validNumberReq);
    expect(result.success).toBe(true);
  });

  it("rejects missing label_ru", () => {
    const { label_ru: _labelRu, ...incomplete } = validBoolReq;
    const result = hardRequirementSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("rejects missing label_uz", () => {
    const { label_uz: _labelUz, ...incomplete } = validBoolReq;
    const result = hardRequirementSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it("rejects invalid type value", () => {
    const result = hardRequirementSchema.safeParse({
      ...validBoolReq,
      type: "text",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty id", () => {
    const result = hardRequirementSchema.safeParse({
      ...validBoolReq,
      id: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects negative order", () => {
    const result = hardRequirementSchema.safeParse({
      ...validBoolReq,
      order: -1,
    });
    expect(result.success).toBe(false);
  });

  it("accepts null min_value for boolean type", () => {
    const result = hardRequirementSchema.safeParse(validBoolReq);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.min_value).toBeNull();
    }
  });

  it("preserves order field", () => {
    const result = hardRequirementSchema.safeParse({
      ...validNumberReq,
      order: 5,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.order).toBe(5);
    }
  });
});
