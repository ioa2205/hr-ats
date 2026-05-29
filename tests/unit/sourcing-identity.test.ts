import { describe, it, expect } from "vitest";
import {
  computeIdentityKey,
  dedupe,
  normalizeName,
  normalizePhone,
  strongSignal,
} from "@/lib/sourcing/identity";
import type { RawSourcedProfile, SourcedContact } from "@/lib/sourcing/types";

function profile(over: {
  name: string;
  source?: RawSourcedProfile["source"];
  source_ref?: string;
  contact?: Partial<SourcedContact>;
  fields?: RawSourcedProfile["profile"]["fields"];
  raw_text?: string;
}): RawSourcedProfile {
  return {
    source: over.source ?? "internal_pool",
    source_ref: over.source_ref ?? "ref-1",
    profile: {
      full_name: over.name,
      headline: null,
      location: null,
      fields: over.fields ?? [],
      raw_text: over.raw_text ?? "raw",
    },
    contact: {
      phone: null,
      email: null,
      telegram: null,
      profile_url: null,
      ...over.contact,
    },
  };
}

describe("name normalization", () => {
  it("lowercases, strips Latin diacritics, and collapses whitespace", () => {
    expect(normalizeName("  Jamës   O'Brien  ")).toBe("james o brien");
  });

  it("preserves Cyrillic letters", () => {
    expect(normalizeName("Иван   Петров")).toBe("иван петров");
  });
});

describe("phone normalization", () => {
  it("reduces to digits only", () => {
    expect(normalizePhone("+998 90 123-45-67")).toBe("998901234567");
  });
});

describe("strongSignal priority (phone > email > url > ref)", () => {
  it("prefers phone", () => {
    expect(strongSignal("hh", "x", { phone: "+998901112233", email: "a@b.c", telegram: null, profile_url: "u" })).toEqual({
      kind: "phone",
      value: "998901112233",
    });
  });
  it("falls back to email when no usable phone", () => {
    expect(strongSignal("hh", "x", { phone: null, email: "A@B.com", telegram: null, profile_url: "u" })).toEqual({
      kind: "email",
      value: "a@b.com",
    });
  });
  it("falls back to source ref when nothing else", () => {
    expect(strongSignal("telegram", "post-9", { phone: null, email: null, telegram: null, profile_url: null })).toEqual({
      kind: "ref",
      value: "telegram:post-9",
    });
  });
});

describe("computeIdentityKey", () => {
  it("is deterministic across calls for the same input", () => {
    const p = profile({ name: "Дилшод Каримов", contact: { phone: "+998 90 111 22 33" } });
    expect(computeIdentityKey(p)).toBe(computeIdentityKey(p));
    expect(computeIdentityKey(p)).toBe("дилшод каримов#phone:998901112233");
  });
});

describe("dedupe", () => {
  it("collapses the same human (same name + phone) appearing twice into one slot", () => {
    const input = [
      profile({ name: "Olim Toshmatov", source_ref: "cand-1", contact: { phone: "+998901234567" }, fields: [{ field: "skill", value: "React", evidence: "React 4y" }] }),
      profile({ name: "OLIM  TOSHMATOV", source_ref: "cand-2", contact: { phone: "998 90 123 45 67" }, fields: [{ field: "skill", value: "Node", evidence: "Node 3y" }] }),
    ];
    const out = dedupe(input);
    expect(out).toHaveLength(1);
    // provenance merged from both records.
    expect(out[0].profile.fields).toHaveLength(2);
  });

  it("keeps genuinely different people apart", () => {
    const out = dedupe([
      profile({ name: "A One", contact: { phone: "+998900000001" } }),
      profile({ name: "B Two", contact: { phone: "+998900000002" } }),
    ]);
    expect(out).toHaveLength(2);
  });

  it("is order-stable (first-seen order, merges fold into the first)", () => {
    const out = dedupe([
      profile({ name: "Z Last", contact: { phone: "+998900000003" } }),
      profile({ name: "A First", contact: { phone: "+998900000004" } }),
      profile({ name: "z last", contact: { phone: "998900000003" }, raw_text: "second" }),
    ]);
    expect(out.map((p) => p.profile.full_name)).toEqual(["Z Last", "A First"]);
  });

  it("merges contact fields preferring the first non-null and records both sources", () => {
    const out = dedupe([
      profile({ name: "Sam", source: "internal_pool", contact: { phone: "+998900000005", email: null } }),
      profile({ name: "Sam", source: "hh", contact: { phone: "998900000005", email: "sam@x.uz" } }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].contact.email).toBe("sam@x.uz");
    expect(out[0].sources).toEqual(["internal_pool", "hh"]);
  });
});
