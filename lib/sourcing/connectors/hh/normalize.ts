/**
 * Pure normalization of one hh.uz resume into a provenance-tagged profile.
 *
 * Same discipline as the internal-pool connector: connectors ONLY fetch +
 * normalize, never judge. Every emitted field carries the verbatim source text
 * as its evidence — we never synthesize a fact hh didn't return. Fields hh hides
 * (name, contacts on unopened resumes) are simply omitted; the fail-closed gate
 * downstream will exclude a candidate whose evidence is too thin to prove a
 * hard requirement, which is the correct behaviour, not a bug.
 */
import type { NormalizedProfile, ProvenancedField, RawSourcedProfile, SourcedContact } from "../../types";
import type { HhResumeItem } from "./schema";

function clean(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

function fullName(item: HhResumeItem): string {
  const parts = [clean(item.first_name), clean(item.middle_name), clean(item.last_name)].filter(
    Boolean,
  );
  if (parts.length > 0) return parts.join(" ");
  // hh hides names on unopened resumes — fall back to the desired position so
  // the candidate is still identifiable in the UI. Dedup keys off the profile
  // URL (a strong signal) when the name is generic.
  const title = clean(item.title);
  return title.length > 0 ? title : `hh resume ${item.id}`;
}

function buildFields(item: HhResumeItem): ProvenancedField[] {
  const fields: ProvenancedField[] = [];

  const title = clean(item.title);
  if (title) fields.push({ field: "headline", value: title, evidence: title });

  const area = clean(item.area?.name);
  if (area) fields.push({ field: "location", value: area, evidence: area });

  if (typeof item.total_experience?.months === "number") {
    const months = item.total_experience.months;
    const years = Math.floor(months / 12);
    const text = `Total experience: ${months} months (~${years} years)`;
    fields.push({ field: "experience_total", value: String(months), evidence: text });
  }

  for (const exp of item.experience ?? []) {
    const company = clean(exp?.company);
    const position = clean(exp?.position);
    const description = clean(exp?.description);
    const headline = [position, company].filter(Boolean).join(" @ ");
    if (!headline && !description) continue;
    const text = [headline, description].filter(Boolean).join(" — ");
    fields.push({ field: "experience", value: headline || description, evidence: text });
  }

  const skillSet = (item.skill_set ?? []).map(clean).filter(Boolean);
  for (const skill of skillSet) {
    fields.push({ field: "skill", value: skill, evidence: skill });
  }
  const skillsText = clean(item.skills);
  if (skillsText) fields.push({ field: "skills_text", value: skillsText, evidence: skillsText });

  for (const lang of item.language ?? []) {
    const name = clean(lang?.name);
    const level = clean(lang?.level?.name);
    if (!name) continue;
    const text = level ? `${name} — ${level}` : name;
    fields.push({ field: "language", value: name, evidence: text });
  }

  return fields;
}

function buildRawText(item: HhResumeItem, name: string, fields: ProvenancedField[]): string {
  const lines: string[] = [`Name: ${name}`];
  if (typeof item.age === "number") lines.push(`Age: ${item.age}`);
  const byField = (f: string) => fields.filter((x) => x.field === f);

  const headline = byField("headline")[0];
  if (headline) lines.push(`Desired position: ${headline.value}`);
  const location = byField("location")[0];
  if (location) lines.push(`Location: ${location.value}`);
  const expTotal = byField("experience_total")[0];
  if (expTotal) lines.push(expTotal.evidence);

  const experience = byField("experience");
  if (experience.length > 0) {
    lines.push("Experience:");
    for (const e of experience) lines.push(`- ${e.evidence}`);
  }
  const skills = byField("skill").map((s) => s.value);
  const skillsText = byField("skills_text")[0];
  if (skills.length > 0) lines.push(`Skills: ${skills.join(", ")}`);
  if (skillsText) lines.push(`Skills (free text): ${skillsText.value}`);

  const languages = byField("language");
  if (languages.length > 0) {
    lines.push("Languages:");
    for (const l of languages) lines.push(`- ${l.evidence}`);
  }
  return lines.join("\n");
}

/** Normalize one hh resume item into a provenance-tagged record. */
export function normalizeHhResume(item: HhResumeItem): RawSourcedProfile {
  const name = fullName(item);
  const fields = buildFields(item);
  const profileUrl = clean(item.alternate_url) || clean(item.url) || null;

  const profile: NormalizedProfile = {
    full_name: name,
    headline: clean(item.title) || null,
    location: clean(item.area?.name) || null,
    fields,
    raw_text: buildRawText(item, name, fields),
  };

  // Search results don't expose phone/email until a resume is opened (a paid
  // action on hh) — so contacts are null here. The profile URL is the strong
  // dedup signal and the link HR follows to open the resume on hh.
  const contact: SourcedContact = {
    phone: null,
    email: null,
    telegram: null,
    profile_url: profileUrl,
  };

  return { source: "hh", source_ref: `hh:${item.id}`, profile, contact };
}
