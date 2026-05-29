import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Subscription } from "@/types";

// In-memory state mutated per test.
let subscription: Subscription | null = null;
let rpcResult: { data: unknown; error: { message: string } | null } = {
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
              single: async () => ({ data: subscription }),
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
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
  subscription = null;
  rpcResult = { data: null, error: null };
  lastRpcCall = null;
});

describe("consumeSourcingQuota", () => {
  it("returns ok with used/limit/remaining on a successful trial consume", async () => {
    rpcResult = {
      data: { ok: true, status: "trialing", used: 1, limit: 2, remaining: 1 },
      error: null,
    };
    const { consumeSourcingQuota } = await import("@/lib/companies/quota");
    const result = await consumeSourcingQuota("c1");
    expect(result).toEqual({ ok: true, used: 1, limit: 2, remaining: 1 });
    expect(lastRpcCall).toEqual({
      name: "try_consume_sourcing_quota",
      args: { p_company_id: "c1", p_units: 1 },
    });
  });

  it("maps sourcing_quota_exceeded to the matching reason and stays ok:false", async () => {
    rpcResult = {
      data: { ok: false, error: "sourcing_quota_exceeded", used: 2, limit: 2, remaining: 0 },
      error: null,
    };
    const { consumeSourcingQuota } = await import("@/lib/companies/quota");
    const result = await consumeSourcingQuota("c1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("sourcing_quota_exceeded");
    expect(result.remaining).toBe(0);
  });

  it("maps trial_expired / no_subscription to a fail-closed reason", async () => {
    rpcResult = { data: { ok: false, error: "trial_expired" }, error: null };
    const { consumeSourcingQuota } = await import("@/lib/companies/quota");
    expect((await consumeSourcingQuota("c1")).reason).toBe("subscription_inactive");

    rpcResult = { data: { ok: false, error: "no_subscription" }, error: null };
    expect((await consumeSourcingQuota("c1")).reason).toBe("no_subscription");
  });

  it("fails closed when the RPC errors", async () => {
    rpcResult = { data: null, error: { message: "deadlock" } };
    const { consumeSourcingQuota } = await import("@/lib/companies/quota");
    const result = await consumeSourcingQuota("c1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("subscription_inactive");
  });

  it("fails closed when the RPC returns an unexpected shape", async () => {
    rpcResult = { data: { totally: "wrong" }, error: null };
    const { consumeSourcingQuota } = await import("@/lib/companies/quota");
    const result = await consumeSourcingQuota("c1");
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("subscription_inactive");
  });

  it("passes a custom unit count through to the RPC", async () => {
    rpcResult = { data: { ok: true, used: 3, limit: 50 }, error: null };
    const { consumeSourcingQuota } = await import("@/lib/companies/quota");
    await consumeSourcingQuota("c1", 3);
    expect(lastRpcCall?.args).toEqual({ p_company_id: "c1", p_units: 3 });
  });
});

describe("canSource (advisory)", () => {
  it("allows a trialing company under the cap", async () => {
    subscription = makeSub({ sourcing_quota_used: 1, sourcing_quota_limit: 2 });
    const { canSource } = await import("@/lib/companies/quota");
    const result = await canSource("c1");
    expect(result.allowed).toBe(true);
    expect(result.used).toBe(1);
    expect(result.limit).toBe(2);
  });

  it("blocks a trialing company at the cap with sourcing_quota_exceeded", async () => {
    subscription = makeSub({ sourcing_quota_used: 2, sourcing_quota_limit: 2 });
    const { canSource } = await import("@/lib/companies/quota");
    const result = await canSource("c1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("sourcing_quota_exceeded");
  });

  it("allows an active (Pro) company regardless of the trial counter", async () => {
    subscription = makeSub({ status: "active", sourcing_quota_used: 99, sourcing_quota_limit: 2 });
    const { canSource } = await import("@/lib/companies/quota");
    expect((await canSource("c1")).allowed).toBe(true);
  });

  it("blocks an expired trial as subscription_inactive", async () => {
    subscription = makeSub({
      status: "trialing",
      trial_ends_at: new Date(FIXED_NOW - 86400_000).toISOString(),
    });
    const { canSource } = await import("@/lib/companies/quota");
    const result = await canSource("c1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("subscription_inactive");
  });

  it("blocks when there is no subscription", async () => {
    subscription = null;
    const { canSource } = await import("@/lib/companies/quota");
    const result = await canSource("c1");
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe("no_subscription");
  });
});

describe("refundSourcingQuota", () => {
  it("calls the refund RPC with the company id and units", async () => {
    rpcResult = { data: null, error: null };
    const { refundSourcingQuota } = await import("@/lib/companies/quota");
    await refundSourcingQuota("c1", 1);
    expect(lastRpcCall).toEqual({
      name: "refund_sourcing_quota",
      args: { p_company_id: "c1", p_units: 1 },
    });
  });
});
