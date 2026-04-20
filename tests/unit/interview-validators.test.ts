import { describe, it, expect } from "vitest";
import { CreateInterviewRequestSchema } from "@/lib/interviews/validators";

function inFuture(minutesAhead: number): string {
  return new Date(Date.now() + minutesAhead * 60_000).toISOString();
}

describe("CreateInterviewRequestSchema", () => {
  const base = {
    duration_minutes: 30,
    location_kind: "google_meet" as const,
    hr_message: "Looking forward to chatting!",
    slot_start_ats: [
      inFuture(60),
      inFuture(60 + 90),
      inFuture(60 + 180),
    ],
  };

  it("accepts a minimal valid payload", () => {
    expect(CreateInterviewRequestSchema.safeParse(base).success).toBe(true);
  });

  it("rejects fewer than 3 slots", () => {
    const bad = { ...base, slot_start_ats: [inFuture(60), inFuture(120)] };
    expect(CreateInterviewRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects more than 6 slots", () => {
    const bad = {
      ...base,
      slot_start_ats: Array.from({ length: 7 }, (_, i) => inFuture(60 + i * 60)),
    };
    expect(CreateInterviewRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects slots in the past", () => {
    const bad = {
      ...base,
      slot_start_ats: [
        new Date(Date.now() - 60_000).toISOString(),
        inFuture(60),
        inFuture(120),
      ],
    };
    expect(CreateInterviewRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects slots less than 30 minutes apart", () => {
    const bad = {
      ...base,
      slot_start_ats: [inFuture(60), inFuture(80), inFuture(160)],
    };
    expect(CreateInterviewRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown durations", () => {
    const bad = { ...base, duration_minutes: 25 } as unknown;
    expect(CreateInterviewRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown location_kind values", () => {
    const bad = { ...base, location_kind: "carrier_pigeon" } as unknown;
    expect(CreateInterviewRequestSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects hr_message longer than 500 chars", () => {
    const bad = { ...base, hr_message: "x".repeat(501) };
    expect(CreateInterviewRequestSchema.safeParse(bad).success).toBe(false);
  });
});
