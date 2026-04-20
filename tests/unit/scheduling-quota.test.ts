import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Subscription } from "@/types";

let subscription: Subscription | null = null;
let interviewBookedCount = 0;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (table === "subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: subscription }),
            }),
          }),
        };
      }
      if (table === "interview_requests") {
        const chain = {
          select: () => chain,
          eq: () => chain,
          gte: async () => ({ count: interviewBookedCount }),
        };
        return chain;
      }
      throw new Error(`unexpected table: ${table}`);
    },
    rpc: async () => ({ data: null, error: null }),
  }),
}));

const FIXED_NOW = new Date("2026-04-19T12:00:00.000Z").getTime();

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    company_id: "11111111-1111-1111-1111-111111111111",
    status: "trialing",
    trial_ends_at: new Date(FIXED_NOW + 7 * 86400_000).toISOString(),
    cv_quota_used: 0,
    cv_quota_limit: 50,
    job_quota_limit: 3,
    pro_started_at: null,
    pro_renews_at: null,
    updated_at: new Date(FIXED_NOW).toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  subscription = null;
  interviewBookedCount = 0;
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("canScheduleInterview", () => {
  it("blocks when there is no subscription", async () => {
    subscription = null;
    const { canScheduleInterview } = await import("@/lib/companies/quota");
    const result = await canScheduleInterview("c1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("no_subscription");
  });

  it("blocks expired/cancelled subscriptions", async () => {
    subscription = makeSub({ status: "expired" });
    const { canScheduleInterview } = await import("@/lib/companies/quota");
    const result = await canScheduleInterview("c1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("subscription_inactive");
  });

  it("allows Pro subscribers without counting", async () => {
    subscription = makeSub({ status: "active" });
    interviewBookedCount = 999;
    const { canScheduleInterview } = await import("@/lib/companies/quota");
    const result = await canScheduleInterview("c1");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Number.POSITIVE_INFINITY);
  });

  it("allows trial users below the 3-booking cap", async () => {
    subscription = makeSub();
    interviewBookedCount = 2;
    const { canScheduleInterview } = await import("@/lib/companies/quota");
    const result = await canScheduleInterview("c1");
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(2);
    expect(result.limit).toBe(3);
  });

  it("blocks trial users at exactly the cap", async () => {
    subscription = makeSub();
    interviewBookedCount = 3;
    const { canScheduleInterview } = await import("@/lib/companies/quota");
    const result = await canScheduleInterview("c1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("scheduling_quota_exceeded");
    expect(result.used).toBe(3);
  });
});
