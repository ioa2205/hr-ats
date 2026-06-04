import { describe, it, expect } from "vitest";
import { pageBounds } from "@/lib/pagination";

describe("pageBounds", () => {
  it("computes range + totalPages for a middle page", () => {
    expect(pageBounds(120, "2", 50)).toEqual({ page: 2, totalPages: 3, from: 50, to: 99 });
  });

  it("defaults to page 1 when the param is missing or non-numeric", () => {
    expect(pageBounds(120, undefined, 50).page).toBe(1);
    expect(pageBounds(120, "abc", 50).page).toBe(1);
  });

  it("clamps a too-large page to the last page", () => {
    expect(pageBounds(120, "99", 50)).toMatchObject({ page: 3, totalPages: 3 });
  });

  it("clamps page 0 / negative to 1", () => {
    expect(pageBounds(120, "0", 50).page).toBe(1);
    expect(pageBounds(120, -5, 50).page).toBe(1);
  });

  it("yields a single page (1) when there are no items", () => {
    expect(pageBounds(0, "1", 50)).toEqual({ page: 1, totalPages: 1, from: 0, to: 49 });
  });
});
