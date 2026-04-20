import { z } from "zod/v4";

export const hardRequirementSchema = z.object({
  id: z.string().min(1),
  label_ru: z.string().min(1),
  label_uz: z.string().min(1),
  label_en: z.string().optional(),
  type: z.enum(["boolean", "number"]),
  min_value: z.number().nullable(),
  order: z.number().int().nonnegative(),
});

/**
 * Trilingual job posting input shape.
 * - `title` / `description` remain required as the primary/legacy columns.
 * - `title_{ru,uz,en}` / `description_{ru,uz,en}` are optional; missing ones
 *   get filled in server-side via Gemini auto-translate before persisting.
 */
export const jobPostingSchema = z.object({
  title: z.string().min(3).max(200),
  title_ru: z.string().min(1).max(200).optional(),
  title_uz: z.string().min(1).max(200).optional(),
  title_en: z.string().min(1).max(200).optional(),
  description: z.string().min(20).max(10000),
  description_ru: z.string().min(1).max(10000).optional(),
  description_uz: z.string().min(1).max(10000).optional(),
  description_en: z.string().min(1).max(10000).optional(),
  required_skills: z.array(z.string().min(1)).default([]),
  hard_requirements: z.array(hardRequirementSchema).default([]),
  status: z.enum(["active", "closed"]).default("active"),
});

export type JobPostingInput = z.infer<typeof jobPostingSchema>;
export type HardRequirementInput = z.infer<typeof hardRequirementSchema>;
