import type { CandidateStatus } from "@/types";
import type { TranslationKey } from "@/lib/i18n/types";

export type CandidateVerdict = "recommend" | "review" | "reject" | "mismatch" | "none";
export type CandidateFilter = Exclude<CandidateVerdict, "none"> | "all" | "new";
export type CandidateSort = "score" | "newest" | "oldest" | "name";
export type CandidateView = "split" | "full" | "compare";

export interface CandidateSignal {
  status: CandidateStatus | string;
  match_score: number | null;
}

export function candidateVerdict(candidate: CandidateSignal): CandidateVerdict {
  if (candidate.status === "unscored") return "mismatch";
  if (candidate.status === "rejected_screening") return "reject";
  const score = candidate.match_score ?? -1;
  if (score < 0) return "none";
  if (score >= 80 && (candidate.status === "analyzed" || candidate.status === "invited")) {
    return "recommend";
  }
  if (score >= 60 && score < 80) return "review";
  if (score < 60 && candidate.status === "analyzed") return "reject";
  return "none";
}

export function candidateMatchesFilter(
  candidate: CandidateSignal,
  filter: CandidateFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "new") {
    return candidate.status === "pending_analysis" || candidate.status === "analyzing";
  }
  return candidateVerdict(candidate) === filter;
}

export function parseCandidateFilter(value: string | null | undefined): CandidateFilter {
  if (
    value === "new" ||
    value === "recommend" ||
    value === "review" ||
    value === "reject" ||
    value === "mismatch"
  ) {
    return value;
  }
  return "all";
}

export function parseCandidateSort(value: string | null | undefined): CandidateSort {
  if (value === "newest" || value === "oldest" || value === "name") return value;
  return "score";
}

export function parseCandidateView(value: string | null | undefined): CandidateView {
  if (value === "full" || value === "compare") return value;
  return "split";
}

export function parseComparisonIds(value: string | null | undefined): string[] {
  if (!value) return [];
  return [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))].slice(0, 3);
}

export function relativeCandidateTime(
  iso: string,
  t: (key: TranslationKey, vars?: Record<string, string>) => string,
): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return t("hr.time.now");
  if (minutes < 60) return t("hr.time.m_ago", { n: String(minutes) });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("hr.time.h_ago", { n: String(hours) });
  return t("hr.time.days_ago", { days: String(Math.floor(hours / 24)) });
}
