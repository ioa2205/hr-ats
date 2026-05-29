/**
 * Requirement profile assembly (Phase 1.3). The frozen profile = a
 * DETERMINISTIC seed from the posting (the verbatim hard_requirements gate,
 * title, required_skills) merged with the AI extraction (must/nice haves,
 * seniority, languages, keywords). The model never touches the gate.
 */
import type { HardRequirement } from "@/types";
import type { RequirementProfile, RequirementProfileExtraction } from "./types";

export interface PostingSeed {
  title: string;
  required_skills: string[];
  hard_requirements: HardRequirement[];
}

export interface RequirementProfileSeed {
  hard_requirements: HardRequirement[];
  title: string;
  location: string | null;
  required_skills: string[];
}

/**
 * Deterministic seed. Note: job_postings has no location column today, so
 * location is null until/unless one is added (hh retrieval in Phase 2 can fill
 * it from search_keywords instead).
 */
export function seedRequirementProfile(posting: PostingSeed): RequirementProfileSeed {
  return {
    hard_requirements: posting.hard_requirements,
    title: posting.title,
    location: null,
    required_skills: posting.required_skills,
  };
}

/** Merge the deterministic seed with the AI extraction into the frozen profile. */
export function buildRequirementProfile(
  posting: PostingSeed,
  extraction: RequirementProfileExtraction,
): RequirementProfile {
  const seed = seedRequirementProfile(posting);
  const seniority = extraction.seniority.trim();
  return {
    hard_requirements: seed.hard_requirements,
    title: seed.title,
    location: seed.location,
    required_skills: seed.required_skills,
    must_haves: extraction.must_haves,
    nice_to_haves: extraction.nice_to_haves,
    seniority: seniority.length > 0 ? seniority : null,
    required_languages: extraction.required_languages,
    search_keywords: extraction.search_keywords,
  };
}
