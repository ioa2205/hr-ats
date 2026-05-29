import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Subscription } from "@/types";

type SubResult = { data: Subscription | null };
type CountResult = { count: number };

// In-memory state mutated by beforeEach for each test.
let subscription: Subscription | null = null;
let activeJobCount = 0;
let companyStatus: "active" | "suspended" | "deleted" | null = "active";
let rpcResult: { data: boolean | null; error: { message: string } | null } = {
  data: null,
  error: null,
};
let lastRpcCall: { name: string; args: Record<string, unknown> } | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from(table: string) {
      if (table === "subscriptions") {
        return {
          select: () => ({
            eq: () => ({
              single: async (): Promise<SubResult> => ({ data: subscription }),
            }),
          }),
        };
      }
      if (table === "companies") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: companyStatus ? { status: companyStatus } : null,
              }),
            }),
          }),
        };
      }
      if (table === "job_postings") {
        return {
          select: () => ({
            eq: () => ({
              eq: async (): Promise<CountResult> => ({ count: activeJobCount }),
            }),
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
    rpc: async (name: string, args: Record<string, unknown>) => {
      lastRpcCall = { name, args };
      return rpcResult;
    },
  }),
}));

const FIXED_NOW = new Date("2026-04-17T12:00:00.000Z").getTime();

function makeSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    company_id: "11111111-1111-1111-1111-111111111111",
    status: "trialing",
    trial_ends_at: new Date(FIXED_NOW + 7 * 86400_000).toISOString(),
    cv_quota_used: 0,
    cv_quota_limit: 50,
    job_quota_limit: 3,
    sourcing_quota_used: 0,
    sourcing_quota_limit: 2,
    pro_started_at: null,
    pro_renews_at: null,
    updated_at: new Date(FIXED_NOW).toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  subscription = null;
  activeJobCount = 0;
  companyStatus = "active";
  rpcResult = { data: null, error: null };
  lastRpcCall = null;
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://localhost:54321");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("getSubscription", () => {
  it("returns the subscription row when present", async () => {
    subscription = makeSub();
    const { getSubscription } = await import("@/lib/companies/quota");
    const sub = await getSubscription("c1");
    expect(sub?.status).toBe("trialing");
    expect(sub?.cv_quota_limit).toBe(50);
  });

  it("returns null when no subscription exists", async () => {
    subscription = null;
    const { getSubscription } = await import("@/lib/companies/quota");
    expect(await getSubscription("c1")).toBeNull();
  });
});

describe("canCreateJob", () => {
  it("allows trialing accounts under the active-job limit", async () => {
    subscription = makeSub();
    activeJobCount = 1;
    const { canCreateJob } = await import("@/lib/companies/quota");
    expect(await canCreateJob("c1")).toEqual({ allowed: true });
  });

  it("blocks at exactly the job_quota_limit", async () => {
    subscription = makeSub({ job_quota_limit: 3 });
    activeJobCount = 3;
    const { canCreateJob } = await import("@/lib/companies/quota");
    expect(await canCreateJob("c1")).toEqual({
      allowed: false,
      reason: "job_quota_exceeded",
    });
  });

  it("blocks expired subscriptions", async () => {
    subscription = makeSub({ status: "expired" });
    const { canCreateJob } = await import("@/lib/companies/quota");
    expect(await canCreateJob("c1")).toEqual({
      allowed: false,
      reason: "subscription_inactive",
    });
  });

  it("blocks trialing past trial_ends_at", async () => {
    subscription = makeSub({
      trial_ends_at: new Date(FIXED_NOW - 86400_000).toISOString(),
    });
    const { canCreateJob } = await import("@/lib/companies/quota");
    expect(await canCreateJob("c1")).toEqual({
      allowed: false,
      reason: "subscription_inactive",
    });
  });

  it("ignores the active-job limit for Pro accounts", async () => {
    subscription = makeSub({ status: "active", job_quota_limit: 3 });
    activeJobCount = 999;
    const { canCreateJob } = await import("@/lib/companies/quota");
    expect(await canCreateJob("c1")).toEqual({ allowed: true });
  });

  it("returns no_subscription when missing", async () => {
    subscription = null;
    const { canCreateJob } = await import("@/lib/companies/quota");
    expect(await canCreateJob("c1")).toEqual({ allowed: false, reason: "no_subscription" });
  });
});

describe("canProcessCv", () => {
  it("allows trialing under cv_quota_limit", async () => {
    subscription = makeSub({ cv_quota_used: 49, cv_quota_limit: 50 });
    const { canProcessCv } = await import("@/lib/companies/quota");
    expect(await canProcessCv("c1")).toEqual({ allowed: true });
  });

  it("blocks at exactly the cv_quota_limit", async () => {
    subscription = makeSub({ cv_quota_used: 50, cv_quota_limit: 50 });
    const { canProcessCv } = await import("@/lib/companies/quota");
    expect(await canProcessCv("c1")).toEqual({
      allowed: false,
      reason: "cv_quota_exceeded",
    });
  });

  it("blocks expired subscriptions", async () => {
    subscription = makeSub({ status: "expired", cv_quota_used: 0 });
    const { canProcessCv } = await import("@/lib/companies/quota");
    expect(await canProcessCv("c1")).toEqual({
      allowed: false,
      reason: "subscription_inactive",
    });
  });

  it("blocks trialing past trial_ends_at", async () => {
    subscription = makeSub({
      trial_ends_at: new Date(FIXED_NOW - 86400_000).toISOString(),
    });
    const { canProcessCv } = await import("@/lib/companies/quota");
    expect(await canProcessCv("c1")).toEqual({
      allowed: false,
      reason: "subscription_inactive",
    });
  });

  it("ignores the CV limit for Pro accounts", async () => {
    subscription = makeSub({ status: "active", cv_quota_used: 9999, cv_quota_limit: 50 });
    const { canProcessCv } = await import("@/lib/companies/quota");
    expect(await canProcessCv("c1")).toEqual({ allowed: true });
  });
});

describe("incrementCvQuota", () => {
  it("calls the try_consume_cv_quota RPC and returns true on success", async () => {
    rpcResult = { data: true, error: null };
    const { incrementCvQuota } = await import("@/lib/companies/quota");
    const ok = await incrementCvQuota("company-uuid");
    expect(ok).toBe(true);
    expect(lastRpcCall).toEqual({
      name: "try_consume_cv_quota",
      args: { p_company_id: "company-uuid" },
    });
  });

  it("returns false when the RPC denies (over quota)", async () => {
    rpcResult = { data: false, error: null };
    const { incrementCvQuota } = await import("@/lib/companies/quota");
    expect(await incrementCvQuota("c1")).toBe(false);
  });

  it("returns false when the RPC errors", async () => {
    rpcResult = { data: null, error: { message: "boom" } };
    const { incrementCvQuota } = await import("@/lib/companies/quota");
    expect(await incrementCvQuota("c1")).toBe(false);
  });
});

describe("canWrite", () => {
  it("returns true for active Pro accounts", async () => {
    subscription = makeSub({ status: "active" });
    const { canWrite } = await import("@/lib/companies/quota");
    expect(await canWrite("c1")).toBe(true);
  });

  it("returns true for trialing accounts within trial window", async () => {
    subscription = makeSub();
    const { canWrite } = await import("@/lib/companies/quota");
    expect(await canWrite("c1")).toBe(true);
  });

  it("returns false for trialing accounts past trial_ends_at", async () => {
    subscription = makeSub({
      trial_ends_at: new Date(FIXED_NOW - 1).toISOString(),
    });
    const { canWrite } = await import("@/lib/companies/quota");
    expect(await canWrite("c1")).toBe(false);
  });

  it("returns false for expired/cancelled accounts", async () => {
    subscription = makeSub({ status: "expired" });
    const { canWrite: canWriteFn } = await import("@/lib/companies/quota");
    expect(await canWriteFn("c1")).toBe(false);

    subscription = makeSub({ status: "cancelled" });
    const reimported = await import("@/lib/companies/quota");
    expect(await reimported.canWrite("c1")).toBe(false);
  });

  it("returns false when no subscription exists", async () => {
    subscription = null;
    const { canWrite } = await import("@/lib/companies/quota");
    expect(await canWrite("c1")).toBe(false);
  });

  it("returns false when the company is suspended", async () => {
    subscription = makeSub({ status: "active" });
    companyStatus = "suspended";
    const { canWrite } = await import("@/lib/companies/quota");
    expect(await canWrite("c1")).toBe(false);
  });
});

describe("getQuotaState", () => {
  it("computes daysRemaining from trial_ends_at", async () => {
    subscription = makeSub({
      trial_ends_at: new Date(FIXED_NOW + 5 * 86400_000).toISOString(),
    });
    const { getQuotaState } = await import("@/lib/companies/quota");
    const q = await getQuotaState("c1");
    expect(q?.daysRemaining).toBe(5);
    expect(q?.canWrite).toBe(true);
  });

  it("returns daysRemaining=0 when trial expired", async () => {
    subscription = makeSub({
      status: "expired",
      trial_ends_at: new Date(FIXED_NOW - 86400_000).toISOString(),
    });
    const { getQuotaState } = await import("@/lib/companies/quota");
    const q = await getQuotaState("c1");
    expect(q?.daysRemaining).toBe(0);
    expect(q?.canWrite).toBe(false);
  });
});
