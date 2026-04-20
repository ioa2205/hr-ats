import { describe, expect, it } from "vitest";
import { unwrapEmbed } from "@/lib/supabase/embed";

describe("unwrapEmbed", () => {
  it("returns null for null", () => {
    expect(unwrapEmbed(null)).toBe(null);
  });

  it("returns null for undefined", () => {
    expect(unwrapEmbed(undefined)).toBe(null);
  });

  it("returns the object as-is when given an object", () => {
    const obj = { company_id: "abc" };
    expect(unwrapEmbed<{ company_id: string }>(obj)).toEqual({ company_id: "abc" });
  });

  it("returns the first element when given a non-empty array", () => {
    const arr = [{ company_id: "abc" }, { company_id: "def" }];
    expect(unwrapEmbed<{ company_id: string }>(arr)).toEqual({ company_id: "abc" });
  });

  it("returns null for an empty array", () => {
    expect(unwrapEmbed([])).toBe(null);
  });

  // Regression: PostgREST returns embedded relations as arrays when an FK is
  // referenced by both a table and a view (e.g. job_postings + the
  // job_postings_with_counts view). Direct casts to the object shape silently
  // produced `undefined.company_id` checks → 404 from HR candidate routes.
  it("normalizes the array-shape PostgREST returns under FK ambiguity", () => {
    const arrayShape: unknown = [{ company_id: "tenant-1" }];
    const job = unwrapEmbed<{ company_id: string }>(arrayShape);
    expect(job?.company_id).toBe("tenant-1");
  });
});
