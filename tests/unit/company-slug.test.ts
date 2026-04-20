import { describe, expect, it } from "vitest";
import { validateSlug } from "@/lib/company-slug";

describe("validateSlug", () => {
  it("accepts simple valid slugs", () => {
    expect(validateSlug("acme")).toEqual({ ok: true });
    expect(validateSlug("acme-co")).toEqual({ ok: true });
    expect(validateSlug("a1b2")).toEqual({ ok: true });
  });

  it("rejects slugs that are too short", () => {
    expect(validateSlug("a")).toEqual({ ok: false, reason: "too_short" });
    expect(validateSlug("ab")).toEqual({ ok: false, reason: "too_short" });
  });

  it("rejects slugs that are too long", () => {
    expect(validateSlug("a".repeat(33))).toEqual({ ok: false, reason: "too_long" });
  });

  it("rejects bad characters", () => {
    expect(validateSlug("acme_co")).toEqual({ ok: false, reason: "bad_chars" });
    expect(validateSlug("-acme")).toEqual({ ok: false, reason: "bad_chars" });
    expect(validateSlug("acme-")).toEqual({ ok: false, reason: "bad_chars" });
    expect(validateSlug("acme@co")).toEqual({ ok: false, reason: "bad_chars" });
  });

  it("normalises case before validating", () => {
    // The validator lowercases input before running regex, matching what
    // callers persist — "Acme" and "acme" are treated as the same slug.
    expect(validateSlug("Acme")).toEqual({ ok: true });
  });

  it("rejects reserved slugs", () => {
    expect(validateSlug("admin")).toEqual({ ok: false, reason: "reserved" });
    expect(validateSlug("api")).toEqual({ ok: false, reason: "reserved" });
  });
});
