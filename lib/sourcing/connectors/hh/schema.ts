/**
 * Zod schemas for the hh.uz / HeadHunter API (api.hh.ru).
 *
 * Discipline: validate the ENVELOPE strictly (so a broken/garbage response
 * fails loudly instead of silently yielding zero candidates), but keep each
 * resume ITEM tolerant — every field we read is optional and unknown fields are
 * ignored, so hh adding/renaming a field never crashes a run. We only ever
 * judge candidates from fields that are actually present (fail-closed upstream).
 *
 * Field shapes follow the documented HeadHunter API
 * (https://github.com/hhru/api). The few things that can only be confirmed
 * against a live employer account (exact resume-search access tier, area ids)
 * are isolated in client.ts / env, not here.
 */
import { z } from "zod/v4";

/** OAuth token response (grant_type=client_credentials | refresh_token). */
export const HhTokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
  refresh_token: z.string().optional(),
});
export type HhToken = z.infer<typeof HhTokenSchema>;

const HhNamedRef = z
  .object({ id: z.string().optional(), name: z.string().optional() })
  .loose();

/** One experience block on a resume. */
const HhExperience = z
  .object({
    company: z.string().nullish(),
    position: z.string().nullish(),
    start: z.string().nullish(),
    end: z.string().nullish(),
    description: z.string().nullish(),
  })
  .loose();

const HhLanguage = z
  .object({
    name: z.string().nullish(),
    level: HhNamedRef.nullish(),
  })
  .loose();

/**
 * A resume search-result item. Personal fields (name, contacts) are frequently
 * hidden by hh until the resume is opened — hence almost everything is nullish.
 */
export const HhResumeItemSchema = z
  .object({
    id: z.string(),
    title: z.string().nullish(),
    first_name: z.string().nullish(),
    last_name: z.string().nullish(),
    middle_name: z.string().nullish(),
    age: z.number().nullish(),
    area: HhNamedRef.nullish(),
    alternate_url: z.string().nullish(),
    url: z.string().nullish(),
    total_experience: z.object({ months: z.number().nullish() }).loose().nullish(),
    experience: z.array(HhExperience).nullish(),
    skill_set: z.array(z.string()).nullish(),
    skills: z.string().nullish(),
    language: z.array(HhLanguage).nullish(),
    salary: z.object({ amount: z.number().nullish(), currency: z.string().nullish() }).loose().nullish(),
  })
  .loose();
export type HhResumeItem = z.infer<typeof HhResumeItemSchema>;

/** The resume-search envelope: GET /resumes. */
export const HhResumeSearchSchema = z.object({
  items: z.array(HhResumeItemSchema),
  found: z.number().optional(),
  pages: z.number().optional(),
  page: z.number().optional(),
  per_page: z.number().optional(),
});
export type HhResumeSearch = z.infer<typeof HhResumeSearchSchema>;
