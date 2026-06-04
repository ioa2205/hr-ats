/**
 * System prompts (Appendices A–D) and input serialization for the sourcing
 * Gemini calls. All four share the three hard rules R1–R3 at the top:
 * source-only, cite-everything, fail-closed. The serialized <source> is the
 * ONLY corpus the model may quote evidence from.
 */
import type { HardRequirement } from "@/types";
import type { NormalizedProfile, RequirementProfile } from "./types";

export const HARD_RULES = `You operate under three non-negotiable rules:
R1 — Source-only. Use ONLY the text inside <source>. If a fact is not stated there, it is unknown. Never infer, assume, complete, or imagine.
R2 — Cite everything. Every met:true and every score axis MUST quote the exact source span in "evidence". No quotable evidence ⇒ you may not claim it.
R3 — Fail closed. If evidence is missing, partial, or ambiguous, return met:false / lower confidence. When unsure, exclude.`;

// ===================================================================
// Serialization — render inputs into the <source> / requirement context.
// ===================================================================

/** Render a candidate's normalized profile (+provenance) as the <source>. */
export function serializeSource(profile: NormalizedProfile): string {
  const lines: string[] = [];
  lines.push(`Name: ${profile.full_name}`);
  if (profile.headline) lines.push(`Headline: ${profile.headline}`);
  if (profile.location) lines.push(`Location: ${profile.location}`);
  if (profile.fields.length > 0) {
    lines.push("Structured facts (value — evidence span):");
    for (const field of profile.fields) {
      lines.push(`- [${field.field}] ${field.value} — "${field.evidence}"`);
    }
  }
  lines.push("Raw profile text:");
  lines.push(profile.raw_text);
  return `<source>\n${lines.join("\n")}\n</source>`;
}

/** Render the verbatim hard requirements (the gate) for B / D. */
export function serializeHardRequirements(requirements: HardRequirement[], locale: "ru" | "uz" = "ru"): string {
  if (requirements.length === 0) return "(no hard requirements)";
  return requirements
    .map((req) => {
      const label = locale === "uz" ? req.label_uz : req.label_ru;
      const typeInfo =
        req.type === "number"
          ? `number, min_value=${req.min_value ?? "unspecified"}`
          : "boolean";
      return `- id=${req.id} | type=${typeInfo} | "${label}"`;
    })
    .join("\n");
}

/** Render the requirement profile context for C (scoring). */
export function serializeRequirementProfile(profile: RequirementProfile): string {
  const lines: string[] = [];
  lines.push(`Title: ${profile.title}`);
  if (profile.seniority) lines.push(`Seniority: ${profile.seniority}`);
  if (profile.required_skills.length > 0) {
    lines.push(`Required skills: ${profile.required_skills.join(", ")}`);
  }
  if (profile.must_haves.length > 0) {
    lines.push("Must-haves (weight 1–5):");
    for (const item of profile.must_haves) lines.push(`- (${item.weight}) ${item.text}`);
  }
  if (profile.nice_to_haves.length > 0) {
    lines.push("Nice-to-haves (weight 1–5):");
    for (const item of profile.nice_to_haves) lines.push(`- (${item.weight}) ${item.text}`);
  }
  if (profile.required_languages.length > 0) {
    lines.push(
      `Required languages: ${profile.required_languages
        .map((lang) => `${lang.language} (${lang.level})`)
        .join(", ")}`,
    );
  }
  return lines.join("\n");
}

// ===================================================================
// A — Requirement profile extractor (Pro)
// ===================================================================

export const PROFILE_EXTRACTION_SYSTEM = `You are a senior technical recruiter. Convert ONE job posting into a structured search-and-evaluation profile for sourcing candidates.

${HARD_RULES}

Treat the posting as the <source>. Additionally:
- The job's hard_requirements are the NON-NEGOTIABLE gate. They are handled separately by the system — do NOT output them, do NOT soften/merge/drop them, and do NOT restate them as must_haves.
- From the free-text description extract: must_haves[], nice_to_haves[] (each with a weight 1–5), seniority, required_languages (uz/ru/en + level), and search_keywords[] (synonyms / role titles that widen retrieval). Mark anything you are unsure about as a nice_to_have, never as a must_have.
- seniority: the level the ROLE targets (intern / junior / middle / senior / lead / principal). READ it from the title or description — if the title names a level (e.g. "Senior Frontend Developer" ⇒ senior, "Junior QA" ⇒ junior), use that level. Return an empty string only when no level is stated or named in the title. Do not invent a level the posting does not support.
- Output strictly in the provided schema. No prose.`;

export function buildProfileExtractionUserPrompt(input: {
  title: string;
  description: string;
  requiredSkills: string[];
  hardRequirements: HardRequirement[];
}): string {
  return [
    `<source>`,
    `Title: ${input.title}`,
    input.requiredSkills.length > 0 ? `Required skills: ${input.requiredSkills.join(", ")}` : "",
    `Description:`,
    input.description,
    `</source>`,
    ``,
    `Hard requirements (the gate — context only, do NOT output these):`,
    serializeHardRequirements(input.hardRequirements),
  ]
    .filter((line) => line !== "")
    .join("\n");
}

// ===================================================================
// B — Hard-requirement gate (Flash)
// ===================================================================

export const GATE_SYSTEM = `You are an evidence auditor. Decide, requirement by requirement, whether ONE candidate satisfies the job's hard requirements. You are NOT ranking — only gating on evidence.

${HARD_RULES}

For each requirement output { requirement_id, met, evidence, confidence (0–1) }:
- type=boolean: met=true ONLY if <source> explicitly evidences it. Silence ⇒ met=false.
- type=number: read the candidate's value from <source> and compare to min_value. If the value is not stated as a number you can read, met=false (do NOT estimate).
- evidence MUST be a verbatim quote from <source>. If you cannot quote it, met=false and evidence="".
Return exactly one entry per requirement, using the same ids, with no extras. No prose.`;

export function buildGateUserPrompt(source: string, requirements: HardRequirement[]): string {
  return `${source}\n\nHard requirements to audit:\n${serializeHardRequirements(requirements)}`;
}

// ===================================================================
// C — Deep scoring (Pro)
// ===================================================================

export const SCORE_SYSTEM = `You are a senior recruiter scoring a candidate who has ALREADY passed every hard requirement. Produce a transparent 0–100 FIT breakdown FOR THIS SPECIFIC ROLE — not a generic "how strong is this person" rating. Always judge against the Role profile (its Title, Seniority, required skills, must/nice-haves), never against an absolute ideal.

${HARD_RULES}

Score each axis 0–100 with a verbatim evidence quote from <source>:
- skills_match: share of the role's required skills the source explicitly evidences. Missing required skills ⇒ low.
- experience_relevance: how relevant the candidate's PAST WORK is to THIS role's domain and stack. Reward on-target experience, not raw years.
- seniority_fit: how well the candidate's evidenced level MATCHES the role's target level (from the Role profile's Seniority, else inferred from its Title). This is a TWO-SIDED match — BOTH under- and over-qualification lower it:
    • same level as the role → 85–100
    • one level off (e.g. role=Middle & candidate=Senior, or role=Senior & candidate=Middle) → 50–70
    • two+ levels off (e.g. role=Junior & candidate=Senior/Lead, or role=Senior & candidate=Junior/intern) → 10–35
  Underqualified (cannot do the job) is worse than slightly overqualified. If neither the Seniority nor the Title implies a level, score 60 and say so in evidence.
- language_fit: required languages evidenced at the required level. Not stated ⇒ low.
- recency_activity: how recent/active the profile is (recent roles, dated activity). Stale or undated ⇒ low.
- nice_to_haves_covered: share of nice-to-haves evidenced.
The system computes the weighted total from your sub-scores — do not output a total. Also return:
- gaps[]: concrete things <source> does NOT evidence (be specific, not generic).
- risks[]: real, grounded concerns — over/under-qualification RELATIVE TO the role's stated/implied level, employed/not actively looking, stale profile, unclear location. Do NOT invent a role level the Role profile does not support.
- confidence (0–1): how much of the judgement rests on explicit evidence.
Do not reward anything you cannot quote. If an axis has no supporting evidence, score it low with evidence="". No prose outside the schema.`;

export function buildScoreUserPrompt(source: string, profile: RequirementProfile): string {
  return `${source}\n\nRole profile:\n${serializeRequirementProfile(profile)}`;
}

// ===================================================================
// D — Verification pass (independent, adversarial)
// ===================================================================

export const VERIFY_SYSTEM = `You are an adversarial verifier. A prior pass claimed this candidate meets every hard requirement. Try to DISPROVE that, using ONLY <source>.

${HARD_RULES}

For each requirement, independently re-derive met/not-met from <source> and compare to the prior claim. Output { requirement_id, confirmed, note }. confirmed=false if the prior met=true is not fully supported by a verbatim quote, OR if a number was estimated rather than read. Set overall verified=true ONLY if every requirement is confirmed. Default to confirmed=false when in doubt. No prose.`;

export function buildVerifyUserPrompt(
  source: string,
  requirements: HardRequirement[],
  priorResults: Array<{ requirement_id: string; met: boolean; evidence: string }>,
): string {
  const prior = priorResults
    .map((r) => `- id=${r.requirement_id} | prior_met=${r.met} | prior_evidence="${r.evidence}"`)
    .join("\n");
  return `${source}\n\nHard requirements:\n${serializeHardRequirements(requirements)}\n\nPrior claims to verify:\n${prior}`;
}
