"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CandidateList } from "./candidate-list";
import { CandidateDetail } from "./candidate-detail";
import { Chip } from "@/components/hr/design";
import type { Candidate } from "@/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useTranslation } from "@/lib/i18n/provider";

interface ApplicantsClientProps {
  postingId: string;
  postingTitle: string;
  companyId: string;
  appUrl: string;
  initialCandidates: Candidate[];
  initialScreenedOut: Pick<Candidate, "id" | "full_name" | "created_at" | "status">[];
  totalCount: number;
  pageSize: number;
  initialPage: number;
  failedCount: number;
  templates: Record<string, string>;
  counts?: {
    all: number;
    new: number;
    recommend: number;
    review: number;
    reject: number;
    mismatch: number;
  };
}

type VerdictFilter = "all" | "new" | "recommend" | "review" | "reject" | "mismatch";

function verdictOf(c: Candidate): "recommend" | "review" | "reject" | "mismatch" | "none" {
  if (c.status === "unscored") return "mismatch";
  if (c.status === "rejected_screening") return "reject";
  const s = c.match_score ?? -1;
  if (s < 0) return "none";
  if (s >= 80 && (c.status === "analyzed" || c.status === "invited")) return "recommend";
  if (s >= 60 && s < 80) return "review";
  if (s < 60 && c.status === "analyzed") return "reject";
  return "none";
}

export function ApplicantsClient({
  postingId,
  postingTitle,
  companyId,
  appUrl,
  initialCandidates,
  initialScreenedOut,
  totalCount,
  pageSize,
  initialPage,
  failedCount,
  templates,
  counts,
}: ApplicantsClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("candidate");

  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [screenedOut, setScreenedOut] = useState(initialScreenedOut);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const [verdictFilter, setVerdictFilter] = useState<VerdictFilter>("all");

  const visibleCandidates = useMemo(() => {
    if (verdictFilter === "all") return candidates;
    if (verdictFilter === "new") {
      return candidates.filter(
        (c) => c.status === "pending_analysis" || c.status === "analyzing",
      );
    }
    return candidates.filter((c) => verdictOf(c) === verdictFilter);
  }, [candidates, verdictFilter]);

  const selectedCandidate = candidates.find((c) => c.id === selectedId) ?? null;

  // ── Page fetch ───────────────────────────────────────────────────
  const fetchPage = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/hr/jobs/${postingId}/applicants?page=${p}`);
        if (res.ok) {
          const data = await res.json();
          setCandidates(data.candidates);
          setTotal(data.pagination.total);
          setPage(p);
        }
      } finally {
        setLoading(false);
      }
    },
    [postingId],
  );

  // ── Retry all failed ─────────────────────────────────────────────
  const [retrying, setRetrying] = useState(false);
  const retryAllFailed = useCallback(async () => {
    setRetrying(true);
    try {
      await fetch(`/api/hr/jobs/${postingId}/retry-all`, { method: "POST" });
    } finally {
      setRetrying(false);
    }
  }, [postingId]);

  // ── Selection via URL ────────────────────────────────────────────
  const selectCandidate = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("candidate", id);
      } else {
        params.delete("candidate");
      }
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // ── Realtime subscription ────────────────────────────────────────
  // Channel name scoped by company_id AND job_posting_id; RLS on
  // candidates enforces tenant isolation at the DB layer regardless.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`company:${companyId}:job:${postingId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "candidates",
          filter: `job_posting_id=eq.${postingId}`,
        },
        (payload: RealtimePostgresChangesPayload<Candidate>) => {
          if (payload.eventType === "UPDATE" && payload.new) {
            const updated = payload.new as Candidate;
            // Defense-in-depth: payload must belong to this posting
            if (updated.job_posting_id !== postingId) return;
            setCandidates((prev) =>
              prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
            );
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "candidates",
          filter: `job_posting_id=eq.${postingId}`,
        },
        (payload: RealtimePostgresChangesPayload<Candidate>) => {
          if (payload.eventType === "INSERT" && payload.new) {
            const inserted = payload.new as Candidate;
            if (inserted.job_posting_id !== postingId) return;
            // rejected_screening (quota_exceeded only, since requirements
            // mismatches now go to status='unscored') → collapsed accordion
            // at the bottom. Everything else, including unscored, goes into
            // the main list so HR can give the candidate a fair look.
            if (inserted.status === "rejected_screening") {
              setScreenedOut((prev) => [
                {
                  id: inserted.id,
                  full_name: inserted.full_name,
                  created_at: inserted.created_at,
                  status: inserted.status,
                },
                ...prev,
              ]);
            } else {
              setCandidates((prev) => [inserted, ...prev]);
              setTotal((prev) => prev + 1);
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postingId, companyId]);

  // ── Candidate update helper (from detail panel) ──────────────────
  const updateCandidate = useCallback((id: string, updates: Partial<Candidate>) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  const chipCounts = counts ?? {
    all: total,
    new: 0,
    recommend: 0,
    review: 0,
    reject: 0,
    mismatch: 0,
  };

  const filterChips = (
    <div className="flex flex-wrap items-center gap-1.5 pb-3.5">
      <Chip
        active={verdictFilter === "all"}
        count={chipCounts.all}
        onClick={() => setVerdictFilter("all")}
      >
        {t("hr.applicants.chip.all")}
      </Chip>
      <Chip
        active={verdictFilter === "new"}
        count={chipCounts.new}
        onClick={() => setVerdictFilter("new")}
      >
        <span
          className="bg-persimmon h-[5px] w-[5px] rounded-full"
          aria-hidden
        />
        {t("hr.applicants.chip.new")}
      </Chip>
      <Chip
        active={verdictFilter === "recommend"}
        count={chipCounts.recommend}
        onClick={() => setVerdictFilter("recommend")}
        className={
          verdictFilter !== "recommend"
            ? "!border-[color:var(--color-persimmon-tint-2)] !text-persimmon-2"
            : undefined
        }
      >
        {t("hr.applicants.chip.top_picks")}
      </Chip>
      <Chip
        active={verdictFilter === "review"}
        count={chipCounts.review}
        onClick={() => setVerdictFilter("review")}
      >
        {t("hr.applicants.chip.review")}
      </Chip>
      <Chip
        active={verdictFilter === "mismatch"}
        count={chipCounts.mismatch}
        onClick={() => setVerdictFilter("mismatch")}
      >
        {t("hr.applicants.chip.below_requirements")}
      </Chip>
      <Chip
        active={verdictFilter === "reject"}
        count={chipCounts.reject}
        onClick={() => setVerdictFilter("reject")}
      >
        {t("hr.applicants.chip.below_bar")}
      </Chip>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {filterChips}
      <div className="border-rule bg-paper shadow-tez-1 flex min-h-0 flex-1 overflow-hidden rounded-md border">
        {/* ── Desktop split view ────────────────────────────────── */}
        <div className="hidden lg:flex lg:min-h-0 lg:flex-1">
          <div className="border-rule w-[420px] shrink-0 overflow-y-auto border-r">
            <CandidateList
              candidates={visibleCandidates}
              screenedOut={screenedOut}
              selectedId={selectedId}
              onSelect={selectCandidate}
              page={page}
              totalPages={totalPages}
              onPageChange={fetchPage}
              loading={loading}
              failedCount={failedCount}
              retrying={retrying}
              onRetryAll={retryAllFailed}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            {selectedCandidate ? (
              <CandidateDetail
                candidate={selectedCandidate}
                postingTitle={postingTitle}
                appUrl={appUrl}
                templates={templates}
                onClose={() => selectCandidate(null)}
                onUpdate={updateCandidate}
              />
            ) : (
              <div className="text-ink-5 flex h-full items-center justify-center">
                <p className="text-sm">{t("applicants.select_prompt")}</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Mobile ────────────────────── */}
        <div className="flex min-h-0 flex-1 flex-col lg:hidden">
          {selectedCandidate ? (
            <CandidateDetail
              candidate={selectedCandidate}
              postingTitle={postingTitle}
              appUrl={appUrl}
              templates={templates}
              onClose={() => selectCandidate(null)}
              onUpdate={updateCandidate}
              mobile
            />
          ) : (
            <div className="flex-1 overflow-y-auto">
              <CandidateList
                candidates={visibleCandidates}
                screenedOut={screenedOut}
                selectedId={selectedId}
                onSelect={selectCandidate}
                page={page}
                totalPages={totalPages}
                onPageChange={fetchPage}
                loading={loading}
                failedCount={failedCount}
                retrying={retrying}
                onRetryAll={retryAllFailed}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
