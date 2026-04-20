import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { verifyClickSignature } from "@/lib/billing/click";

// Secret value must match what tests/setup.ts exports into process.env before
// lib/env.ts is imported. Changing one requires the other.
const TEST_SECRET = "test-click-secret";

function prepareSig({
  trans,
  service,
  merchant,
  amount,
  action,
  time,
  secret,
}: {
  trans: string;
  service: string;
  merchant: string;
  amount: string;
  action: string;
  time: string;
  secret: string;
}) {
  return createHash("md5")
    .update(`${trans}${service}${secret}${merchant}${amount}${action}${time}`)
    .digest("hex");
}

function completeSig(args: Parameters<typeof prepareSig>[0] & { prepare: string }) {
  return createHash("md5")
    .update(
      `${args.trans}${args.service}${args.secret}${args.merchant}${args.prepare}${args.amount}${args.action}${args.time}`,
    )
    .digest("hex");
}

describe("Click webhook signature", () => {
  const baseline = {
    trans: "42",
    service: "SVC-1",
    merchant: "inv-abc",
    amount: "1500000.00",
    time: "2026-04-20 12:00:00",
    secret: TEST_SECRET,
  };

  it("accepts a valid prepare signature", () => {
    const sig = prepareSig({ ...baseline, action: "0" });
    expect(
      verifyClickSignature({
        click_trans_id: baseline.trans,
        service_id: baseline.service,
        merchant_trans_id: baseline.merchant,
        amount: baseline.amount,
        action: "0",
        sign_time: baseline.time,
        sign_string: sig,
      }),
    ).toBe(true);
  });

  it("accepts a valid complete signature with merchant_prepare_id", () => {
    const sig = completeSig({ ...baseline, action: "1", prepare: "inv-abc" });
    expect(
      verifyClickSignature({
        click_trans_id: baseline.trans,
        service_id: baseline.service,
        merchant_trans_id: baseline.merchant,
        merchant_prepare_id: "inv-abc",
        amount: baseline.amount,
        action: "1",
        sign_time: baseline.time,
        sign_string: sig,
      }),
    ).toBe(true);
  });

  it("rejects a tampered amount", () => {
    const sig = prepareSig({ ...baseline, action: "0" });
    expect(
      verifyClickSignature({
        click_trans_id: baseline.trans,
        service_id: baseline.service,
        merchant_trans_id: baseline.merchant,
        amount: "999.00",
        action: "0",
        sign_time: baseline.time,
        sign_string: sig,
      }),
    ).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const sig = prepareSig({ ...baseline, action: "0", secret: "other-secret" });
    expect(
      verifyClickSignature({
        click_trans_id: baseline.trans,
        service_id: baseline.service,
        merchant_trans_id: baseline.merchant,
        amount: baseline.amount,
        action: "0",
        sign_time: baseline.time,
        sign_string: sig,
      }),
    ).toBe(false);
  });

  it("rejects a complete with missing merchant_prepare_id", () => {
    const sig = completeSig({ ...baseline, action: "1", prepare: "" });
    expect(
      verifyClickSignature({
        click_trans_id: baseline.trans,
        service_id: baseline.service,
        merchant_trans_id: baseline.merchant,
        merchant_prepare_id: "prep-999",
        amount: baseline.amount,
        action: "1",
        sign_time: baseline.time,
        sign_string: sig,
      }),
    ).toBe(false);
  });
});
