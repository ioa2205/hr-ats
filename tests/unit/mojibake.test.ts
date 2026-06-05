import { describe, expect, it } from "vitest";
import { findMojibake } from "../../scripts/check-mojibake.mjs";

describe("text integrity", () => {
  it("keeps production source free of common mojibake fingerprints", () => {
    expect(findMojibake()).toEqual([]);
  });
});
