import { describe, it, expect, vi, beforeEach } from "vitest";

// retry.ts → dispatch.ts → @/lib/supabase/admin throws under jsdom; the drainer
// takes an injected store, so a no-op stub is enough.
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({}) }));

const {
  drainNotificationRetries,
  MAX_DELIVERY_ATTEMPTS,
} = await import("@/lib/notifications/retry");
import type { DeliveryStore, DueDelivery } from "@/lib/notifications/retry";
import type { SendResult } from "@/lib/email/send";

interface Recorder {
  sent: Array<{ id: string; attempts: number; messageId: string | null }>;
  failed: Array<{ id: string; attempts: number; error: string; nextRetryIso: string | null }>;
  suppressed: string[];
}

function makeStore(rows: DueDelivery[], suppressed: string[] = []) {
  const rec: Recorder = { sent: [], failed: [], suppressed: [] };
  const suppressedSet = new Set(suppressed);
  const store: DeliveryStore = {
    loadDue: async () => rows,
    isSuppressed: async (email) => suppressedSet.has(email),
    markSent: async (id, attempts, messageId) => {
      rec.sent.push({ id, attempts, messageId });
    },
    markFailed: async (id, attempts, error, nextRetryIso) => {
      rec.failed.push({ id, attempts, error, nextRetryIso });
    },
    markSuppressed: async (id) => {
      rec.suppressed.push(id);
    },
  };
  return { store, rec };
}

const NOW = new Date("2026-06-05T12:00:00.000Z");
const logger = { info: vi.fn(), error: vi.fn() };

function row(over: Partial<DueDelivery> = {}): DueDelivery {
  return {
    id: "d1",
    recipient_email: "a@b.uz",
    subject: "Hi",
    body_html: "<p>hi</p>",
    attempts: 0,
    ...over,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("drainNotificationRetries", () => {
  it("sends a due row and marks it sent with an incremented attempt", async () => {
    const { store, rec } = makeStore([row()]);
    const send = vi.fn(async (): Promise<SendResult> => ({ ok: true, messageId: "m1" }));

    const summary = await drainNotificationRetries({ store, send, now: () => NOW, logger });

    expect(send).toHaveBeenCalledOnce();
    expect(summary).toMatchObject({ picked: 1, sent: 1, failed: 0, exhausted: 0 });
    expect(rec.sent[0]).toEqual({ id: "d1", attempts: 1, messageId: "m1" });
  });

  it("reschedules a transient failure with a future next_retry_at", async () => {
    const { store, rec } = makeStore([row({ attempts: 0 })]);
    const send = vi.fn(async (): Promise<SendResult> => ({ ok: false, error: "resend_500" }));

    const summary = await drainNotificationRetries({ store, send, now: () => NOW, logger });

    expect(summary.failed).toBe(1);
    expect(summary.exhausted).toBe(0);
    expect(rec.failed[0].attempts).toBe(1);
    expect(rec.failed[0].nextRetryIso).not.toBeNull();
    expect(Date.parse(rec.failed[0].nextRetryIso as string)).toBeGreaterThan(NOW.getTime());
  });

  it("DLQs a row (next_retry_at = null) once it exhausts MAX_DELIVERY_ATTEMPTS", async () => {
    const { store, rec } = makeStore([row({ attempts: MAX_DELIVERY_ATTEMPTS - 1 })]);
    const send = vi.fn(async (): Promise<SendResult> => ({ ok: false, error: "resend_500" }));

    const summary = await drainNotificationRetries({ store, send, now: () => NOW, logger });

    expect(summary.exhausted).toBe(1);
    expect(rec.failed[0].attempts).toBe(MAX_DELIVERY_ATTEMPTS);
    expect(rec.failed[0].nextRetryIso).toBeNull();
  });

  it("suppresses rows whose recipient is on the suppression list, without sending", async () => {
    const { store, rec } = makeStore([row({ recipient_email: "bounced@b.uz" })], ["bounced@b.uz"]);
    const send = vi.fn(async (): Promise<SendResult> => ({ ok: true }));

    const summary = await drainNotificationRetries({ store, send, now: () => NOW, logger });

    expect(send).not.toHaveBeenCalled();
    expect(summary.suppressed).toBe(1);
    expect(rec.suppressed).toEqual(["d1"]);
  });

  it("terminally fails legacy rows with no body_html", async () => {
    const { store, rec } = makeStore([row({ body_html: null })]);
    const send = vi.fn(async (): Promise<SendResult> => ({ ok: true }));

    const summary = await drainNotificationRetries({ store, send, now: () => NOW, logger });

    expect(send).not.toHaveBeenCalled();
    expect(summary.skippedNoBody).toBe(1);
    expect(rec.failed[0]).toMatchObject({ error: "no_body_html", nextRetryIso: null });
  });
});
