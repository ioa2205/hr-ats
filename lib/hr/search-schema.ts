import { z } from "zod";

export const HR_JOB_LIMIT = 8;
export const HR_CANDIDATE_LIMIT = 10;
export const HR_MIN_Q_LENGTH = 1;
export const HR_MAX_Q_LENGTH = 80;

export const hrSearchQuerySchema = z.object({
  q: z.string().trim().min(HR_MIN_Q_LENGTH).max(HR_MAX_Q_LENGTH),
});

const jobHit = z.object({
  id: z.string().uuid(),
  title: z.string(),
  titleRu: z.string().nullable(),
  titleUz: z.string().nullable(),
  titleEn: z.string().nullable(),
  status: z.string(),
  createdAt: z.string(),
});

const candidateHit = z.object({
  id: z.string().uuid(),
  fullName: z.string(),
  status: z.string(),
  matchScore: z.number().nullable(),
  jobId: z.string().uuid(),
  jobTitle: z.string(),
  summary: z.string().nullable(),
  createdAt: z.string(),
});

export const hrSearchResponseSchema = z.object({
  jobs: z.array(jobHit),
  candidates: z.array(candidateHit),
});

export type HRSearchResponse = z.infer<typeof hrSearchResponseSchema>;

export function sanitizeHrIlike(q: string): string {
  return q
    .replace(/[\\%_]/g, (c) => `\\${c}`)
    .replace(/[(),]/g, " ")
    .trim();
}
