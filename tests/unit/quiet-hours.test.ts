import { describe, expect, it } from "vitest";
import { isWithinQuietHours } from "@/lib/notifications/quiet-hours";

describe("isWithinQuietHours", () => {
  it("returns false when either bound is null", () => {
    expect(isWithinQuietHours(15, null, 9)).toBe(false);
    expect(isWithinQuietHours(15, 22, null)).toBe(false);
    expect(isWithinQuietHours(15, null, null)).toBe(false);
  });

  it("returns false when start equals end (treated as disabled)", () => {
    expect(isWithinQuietHours(9, 9, 9)).toBe(false);
  });

  it("handles a non-wrapping window (start < end)", () => {
    expect(isWithinQuietHours(13, 13, 17)).toBe(true);
    expect(isWithinQuietHours(16, 13, 17)).toBe(true);
    expect(isWithinQuietHours(17, 13, 17)).toBe(false);
    expect(isWithinQuietHours(12, 13, 17)).toBe(false);
  });

  it("handles a wrapping window (start > end)", () => {
    expect(isWithinQuietHours(22, 22, 7)).toBe(true);
    expect(isWithinQuietHours(23, 22, 7)).toBe(true);
    expect(isWithinQuietHours(0, 22, 7)).toBe(true);
    expect(isWithinQuietHours(6, 22, 7)).toBe(true);
    expect(isWithinQuietHours(7, 22, 7)).toBe(false);
    expect(isWithinQuietHours(12, 22, 7)).toBe(false);
    expect(isWithinQuietHours(21, 22, 7)).toBe(false);
  });
});
