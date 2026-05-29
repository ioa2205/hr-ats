import { describe, it, expect } from "vitest";
import {
  createInternalPoolConnector,
  normalizePoolCandidate,
  type PoolCandidateRow,
} from "@/lib/sourcing/connectors/internal-pool";
import type { FetchBudget, RawSourcedProfile, RequirementProfile } from "@/lib/sourcing/types";

const BUDGET: FetchBudget = { maxFetched: 100, maxProCalls: 50, tokenCeiling: 1_000_000 };
const PROFILE = {} as RequirementProfile;

function row(over: Partial<PoolCandidateRow> = {}): PoolCandidateRow {
  return {
    id: "cand-1",
    full_name: "Olim Toshmatov",
    phone_number: "+998901234567",
    language_detected: "ru",
    requirements_snapshot: [
      { id: "r1", label_ru: "Водительские права", label_uz: "Guvohnoma", type: "boolean", min_value: null, order: 0 },
    ],
    requirements_responses: { r1: "Да, есть права категории B" },
    strengths: ["5 лет коммерческого опыта на React"],
    one_line_summary: "Senior frontend разработчик",
    ...over,
  };
}

describe("normalizePoolCandidate", () => {
  it("emits self-declared answers as high-trust provenance with the snapshot label", () => {
    const record = normalizePoolCandidate(row());
    const selfDeclared = record.profile.fields.find((f) => f.field === "self_declared");
    expect(selfDeclared?.value).toBe("Водительские права: Да, есть права категории B");
    expect(selfDeclared?.evidence).toBe(selfDeclared?.value);
  });

  it("labels prior screening insights as secondary provenance", () => {
    const record = normalizePoolCandidate(row());
    expect(record.profile.fields.some((f) => f.field === "prior_screening_summary")).toBe(true);
    expect(record.profile.fields.some((f) => f.field === "prior_screening_strength")).toBe(true);
  });

  it("puts the phone in contact and the candidate id in source_ref, source=internal_pool", () => {
    const record = normalizePoolCandidate(row());
    expect(record.contact.phone).toBe("+998901234567");
    expect(record.contact.email).toBeNull();
    expect(record.source_ref).toBe("cand-1");
    expect(record.source).toBe("internal_pool");
  });

  it("raw_text contains the self-declared answer so evidence quotes can match", () => {
    const record = normalizePoolCandidate(row());
    expect(record.profile.raw_text).toContain("Водительские права: Да, есть права категории B");
  });

  it("skips empty/whitespace and malformed responses (no fabricated facts)", () => {
    const record = normalizePoolCandidate(
      row({ requirements_responses: { r1: "   " }, strengths: null, one_line_summary: null }),
    );
    expect(record.profile.fields.some((f) => f.field === "self_declared")).toBe(false);
  });

  it("falls back to the requirement id when no snapshot label exists", () => {
    const record = normalizePoolCandidate(
      row({ requirements_snapshot: null, requirements_responses: { rX: "yes" } }),
    );
    const selfDeclared = record.profile.fields.find((f) => f.field === "self_declared");
    expect(selfDeclared?.value).toBe("rX: yes");
  });
});

describe("createInternalPoolConnector", () => {
  it("is always configured (the company's own data)", () => {
    const connector = createInternalPoolConnector(async () => []);
    expect(connector.isConfigured()).toBe(true);
    expect(connector.kind).toBe("internal_pool");
  });

  it("yields normalized records and respects the fetch budget cap", async () => {
    const rows = Array.from({ length: 5 }, (_, i) => row({ id: `c${i}`, full_name: `P ${i}` }));
    const connector = createInternalPoolConnector(async (limit) => rows.slice(0, limit));
    const out: RawSourcedProfile[] = [];
    for await (const record of connector.fetch(PROFILE, { ...BUDGET, maxFetched: 3 })) {
      out.push(record);
    }
    expect(out).toHaveLength(3);
    expect(out[0].source).toBe("internal_pool");
  });
});
