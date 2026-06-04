/**
 * The hh.uz SourceConnector (Phase 2). Drives resume search + pagination and
 * normalizes each hit; it never judges (the funnel's gate/score/verify do).
 * The search function is injected so the connector is unit-tested with no
 * network — index.ts binds the real {@link HhClient}.
 */
import type { RequirementProfile, RawSourcedProfile, SourceConnector } from "../../types";
import type { HhResumeSearch, HhResumeItem } from "./schema";
import type { HhSearchParams } from "./client";
import { normalizeHhResume } from "./normalize";

export interface HhConnectorDeps {
  search: (params: HhSearchParams) => Promise<HhResumeSearch>;
  isConfigured: () => boolean;
  /** page size (hh caps at 100). Defaults to 50. */
  perPage?: number;
  /** user free-text override; when non-empty, replaces buildQueryText(profile). */
  textOverride?: string;
}

function clampPerPage(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(Math.max(Math.trunc(value), 1), 100);
}

/** Trim, case-insensitively dedupe, and space-join terms into an hh `text` query. */
function joinTerms(parts: string[]): string {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const raw of parts) {
    const term = (raw ?? "").trim();
    const key = term.toLowerCase();
    if (term.length === 0 || seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  return terms.join(" ");
}

/**
 * The hh `text` query from the frozen requirement profile. Prefers the
 * AI-extracted search keywords; falls back to the job title + required skills
 * so a thin profile still produces a meaningful search.
 */
export function buildQueryText(profile: RequirementProfile): string {
  const parts =
    profile.search_keywords.length > 0
      ? profile.search_keywords
      : [profile.title, ...profile.required_skills];
  return joinTerms(parts);
}

/**
 * The hh `text` query from a user's free-text keyword override (same trim /
 * dedupe / join as the AI-derived query, so the displayed and searched strings
 * match). Empty result ⇒ no usable override (caller falls back to the profile).
 */
export function joinKeywords(keywords: string[]): string {
  return joinTerms(keywords);
}

export function createHhConnector(deps: HhConnectorDeps): SourceConnector {
  const perPage = clampPerPage(deps.perPage ?? 50);
  return {
    kind: "hh",
    isConfigured: deps.isConfigured,
    async *fetch(profile: RequirementProfile, budget): AsyncIterable<RawSourcedProfile> {
      if (!deps.isConfigured()) return;
      const override = deps.textOverride?.trim() ?? "";
      const text = override.length > 0 ? override : buildQueryText(profile);
      let page = 0;
      let emitted = 0;
      while (emitted < budget.maxFetched) {
        const res = await deps.search({ text, perPage, page });
        const items: HhResumeItem[] = res.items ?? [];
        if (items.length === 0) break;
        for (const item of items) {
          if (emitted >= budget.maxFetched) break;
          yield normalizeHhResume(item);
          emitted += 1;
        }
        // Stop at the last page, whether hh reports total pages or returns a
        // short final page.
        page += 1;
        if (typeof res.pages === "number" && page >= res.pages) break;
        if (items.length < perPage) break;
      }
    },
  };
}
