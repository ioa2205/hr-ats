/**
 * Normalize an embedded PostgREST relation result. Supabase returns embedded
 * relations as either an object or an array of objects: when an FK column is
 * referenced by multiple relations (e.g. a table and a view that re-exposes
 * it), PostgREST cannot prove cardinality and returns an array even for
 * many-to-one joins. Casting straight to the object shape silently produces
 * `undefined` accesses at runtime — use this helper instead.
 *
 * Why: the `candidates → job_postings` FK is also surfaced through the
 * `job_postings_with_counts` view, so `select("..., job_postings!inner(...)")`
 * on `candidates` may return `job_postings` as an array. Five HR routes that
 * cast directly to the object shape returned 404 in that case.
 */
export function unwrapEmbed<T>(value: unknown): T | null {
  if (value == null) return null;
  if (Array.isArray(value)) return (value[0] ?? null) as T | null;
  return value as T;
}
