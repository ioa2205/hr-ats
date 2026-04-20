import { describe, it, expect } from "vitest";
import { searchQuerySchema, sanitizeIlike, isUuid, MAX_Q_LENGTH } from "./search-schema";

describe("searchQuerySchema", () => {
  it("trims and accepts a single character", () => {
    const r = searchQuerySchema.safeParse({ q: "  a  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.q).toBe("a");
  });

  it("rejects empty input", () => {
    expect(searchQuerySchema.safeParse({ q: "" }).success).toBe(false);
    expect(searchQuerySchema.safeParse({ q: "   " }).success).toBe(false);
  });

  it(`rejects input longer than ${MAX_Q_LENGTH} chars`, () => {
    const q = "a".repeat(MAX_Q_LENGTH + 1);
    expect(searchQuerySchema.safeParse({ q }).success).toBe(false);
  });
});

describe("sanitizeIlike", () => {
  it("escapes percent, underscore, and backslash", () => {
    expect(sanitizeIlike("50%_off")).toBe("50\\%\\_off");
    expect(sanitizeIlike("back\\slash")).toBe("back\\\\slash");
  });

  it("leaves ordinary text untouched", () => {
    expect(sanitizeIlike("acme corp")).toBe("acme corp");
  });
});

describe("isUuid", () => {
  it("matches canonical uuids case-insensitive", () => {
    expect(isUuid("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(isUuid("123E4567-E89B-12D3-A456-426614174000")).toBe(true);
  });

  it("rejects non-uuids", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("123e4567-e89b-12d3-a456")).toBe(false);
  });
});
