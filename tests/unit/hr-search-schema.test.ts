import { describe, expect, it } from "vitest";
import {
  HR_MAX_Q_LENGTH,
  hrSearchQuerySchema,
  hrSearchResponseSchema,
  sanitizeHrIlike,
} from "@/lib/hr/search-schema";

describe("HR search schema", () => {
  it("trims queries and rejects empty input", () => {
    expect(hrSearchQuerySchema.safeParse({ q: "  designer  " }).data?.q).toBe("designer");
    expect(hrSearchQuerySchema.safeParse({ q: "" }).success).toBe(false);
    expect(hrSearchQuerySchema.safeParse({ q: "x".repeat(HR_MAX_Q_LENGTH + 1) }).success).toBe(
      false,
    );
  });

  it("sanitizes PostgREST ilike control characters", () => {
    expect(sanitizeHrIlike("100%_fit,(senior)")).toBe("100\\%\\_fit  senior");
  });

  it("accepts the command palette response shape", () => {
    expect(
      hrSearchResponseSchema.parse({
        jobs: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            title: "Designer",
            titleRu: null,
            titleUz: null,
            titleEn: "Designer",
            status: "active",
            createdAt: "2026-06-05T00:00:00.000Z",
          },
        ],
        candidates: [
          {
            id: "22222222-2222-4222-8222-222222222222",
            fullName: "Madina Yusufova",
            status: "analyzed",
            matchScore: 94,
            jobId: "11111111-1111-4111-8111-111111111111",
            jobTitle: "Designer",
            summary: "Strong fit",
            createdAt: "2026-06-05T00:00:00.000Z",
          },
        ],
      }),
    ).toMatchObject({ jobs: [{ title: "Designer" }], candidates: [{ matchScore: 94 }] });
  });
});
