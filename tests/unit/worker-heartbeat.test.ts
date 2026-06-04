import { describe, it, expect, vi, beforeEach } from "vitest";

let lastRpc: { name: string; args: Record<string, unknown> } | null = null;
let rpcError: { message: string } | null = null;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    rpc: async (name: string, args: Record<string, unknown>) => {
      lastRpc = { name, args };
      return { error: rpcError };
    },
  }),
}));

const { recordWorkerHeartbeat, WORKER } = await import("@/lib/observability/heartbeat");

beforeEach(() => {
  lastRpc = null;
  rpcError = null;
});

describe("recordWorkerHeartbeat", () => {
  it("records a success with the canonical worker name and no error", async () => {
    await recordWorkerHeartbeat(WORKER.sourcingRun, true);
    expect(lastRpc).toEqual({
      name: "record_worker_heartbeat",
      args: { p_worker: "sourcing-run", p_ok: true, p_error: null },
    });
  });

  it("records a failure with a truncated error message", async () => {
    await recordWorkerHeartbeat(WORKER.notificationRetry, false, "x".repeat(900));
    expect(lastRpc?.args.p_ok).toBe(false);
    expect((lastRpc?.args.p_error as string).length).toBe(500);
  });

  it("swallows RPC errors so a heartbeat write never masks the worker result", async () => {
    rpcError = { message: "boom" };
    await expect(recordWorkerHeartbeat(WORKER.telegramIngest, true)).resolves.toBeUndefined();
  });
});
