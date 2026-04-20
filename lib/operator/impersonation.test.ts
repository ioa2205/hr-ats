import { describe, it, expect } from "vitest";
import {
  elapsedMs,
  formatElapsed,
  formatRemaining,
  IMPERSONATION_MAX_MS,
  IMPERSONATION_WARN_AT_MS,
  impersonationState,
  remainingMs,
} from "./impersonation";

const T0 = Date.parse("2026-04-19T10:00:00Z");

describe("elapsedMs", () => {
  it("returns ms since startedAt", () => {
    expect(elapsedMs(new Date(T0).toISOString(), T0 + 1500)).toBe(1500);
  });

  it("clamps negative elapsed to zero (clock skew)", () => {
    expect(elapsedMs(new Date(T0).toISOString(), T0 - 10_000)).toBe(0);
  });

  it("returns 0 for an unparseable startedAt", () => {
    expect(elapsedMs("not-a-date", T0)).toBe(0);
  });
});

describe("impersonationState", () => {
  it("is active before 55m", () => {
    expect(impersonationState(IMPERSONATION_WARN_AT_MS - 1)).toBe("active");
  });
  it("is warning between 55m and 60m", () => {
    expect(impersonationState(IMPERSONATION_WARN_AT_MS)).toBe("warning");
    expect(impersonationState(IMPERSONATION_MAX_MS - 1)).toBe("warning");
  });
  it("is expired at 60m", () => {
    expect(impersonationState(IMPERSONATION_MAX_MS)).toBe("expired");
    expect(impersonationState(IMPERSONATION_MAX_MS + 1_000)).toBe("expired");
  });
});

describe("remainingMs", () => {
  it("counts down to zero and stays there", () => {
    expect(remainingMs(0)).toBe(IMPERSONATION_MAX_MS);
    expect(remainingMs(IMPERSONATION_MAX_MS)).toBe(0);
    expect(remainingMs(IMPERSONATION_MAX_MS + 10_000)).toBe(0);
  });
});

describe("formatters", () => {
  it("formats elapsed compactly", () => {
    expect(formatElapsed(0)).toBe("0s");
    expect(formatElapsed(30_000)).toBe("30s");
    expect(formatElapsed(60_000)).toBe("1m");
    expect(formatElapsed(90_000)).toBe("1m 30s");
  });

  it("formats remaining as mm:ss", () => {
    expect(formatRemaining(0)).toBe("0:00");
    expect(formatRemaining(5_000)).toBe("0:05");
    expect(formatRemaining(65_000)).toBe("1:05");
    expect(formatRemaining(IMPERSONATION_MAX_MS)).toBe("60:00");
  });
});
