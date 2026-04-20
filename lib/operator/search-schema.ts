import { z } from "zod";

export const COMPANY_LIMIT = 10;
export const USER_LIMIT = 10;
export const AUDIT_LIMIT = 5;
export const MIN_Q_LENGTH = 1;
export const MAX_Q_LENGTH = 80;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(MIN_Q_LENGTH).max(MAX_Q_LENGTH),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;

const companyHit = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  status: z.string(),
});

const userHit = z.object({
  id: z.string().uuid(),
  email: z.string(),
  fullName: z.string().nullable(),
  isOperator: z.boolean(),
});

const auditHit = z.object({
  id: z.number(),
  action: z.string(),
  actor: z.string().nullable(),
  createdAt: z.string(),
});

export const searchResponseSchema = z.object({
  companies: z.array(companyHit),
  users: z.array(userHit),
  audit: z.array(auditHit),
});

export type SearchResponse = z.infer<typeof searchResponseSchema>;

/**
 * Escape Postgres ILIKE metacharacters. Keeps wildcards as literal input.
 * Also strips commas and parentheses that would otherwise confuse PostgREST's
 * .or() filter parser.
 */
export function sanitizeIlike(q: string): string {
  return q
    .replace(/[\\%_]/g, (c) => `\\${c}`)
    .replace(/[(),]/g, " ")
    .trim();
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}
