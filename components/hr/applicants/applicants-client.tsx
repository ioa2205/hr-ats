"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { GitCompareArrows, Search, X } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CandidateList } from "./candidate-list";
import { CandidateDetail } from "./candidate-detail";
import { CandidateComparison } from "./candidate-comparison";
import {
  Button,
  Alert,
  FilterChip,
  Panel,
  SearchField,
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui";
import type { Candidate } from "@/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useTranslation } from "@/lib/i18n/provider";
import {
  candidateMatchesFilter,
  parseCandidateFilter,
  parseCandidateSort,
  parseCandidateView,
  parseComparisonIds,
  type CandidateFilter,
  type CandidateSort,
} from "@/lib/applicants/presentation";

interface ApplicantsClientProps {
  postingId: string;
  postingTitle: string;
  companyId: string;
  appUrl: string;
  initialCandidates: Candidate[];
  initialSelectedCandidate?: Candidate | null;
  initialComparisonCandidates?: Candidate[];
  initialScreenedOut: Pick<Candidate, "id" | "full_name" | "created_at" | "status">[];
  totalCount: number;
  pageSize: number;
  initialPage: number;
  initialQuery?: string;
  initialFilter?: CandidateFilter;
  initialSort?: CandidateSort;
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

function useTabletViewport() {
  const [isTablet, setIsTablet] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px) and (max-width: 1279px)");
    const sync = () => setIsTablet(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return isTablet;
}

export function ApplicantsClient({
  postingId,
  postingTitle,
  companyId,
  appUrl,
  initialCandidates,
  initialSelectedCandidate = null,
  initialComparisonCandidates = [],
  initialScreenedOut,
  totalCount,
  pageSize,
  initialPage,
  initialQuery = "",
  initialFilter = "all",
  initialSort = "score",
  failedCount,
  templates,
  counts,
}: ApplicantsClientProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const isTablet = useTabletViewport();
  const selectedId = searchParams.get("candidate");
  const returnTo = searchParams.get("returnTo");
  const view = parseCandidateView(searchParams.get("view"));
  const compareIds = parseComparisonIds(searchParams.get("compare"));

  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [selectedExtra, setSelectedExtra] = useState<Candidate | null>(initialSelectedCandidate);
  const [comparisonMap, setComparisonMap] = useState<Record<string, Candidate>>(() =>
    Object.fromEntries(
      [...initialCandidates, ...initialComparisonCandidates].map((candidate) => [
        candidate.id,
        candidate,
      ]),
    ),
  );
  const [screenedOut, setScreenedOut] = useState(initialScreenedOut);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [filter, setFilter] = useState<CandidateFilter>(initialFilter);
  const [sort, setSort] = useState<CandidateSort>(initialSort);
  const [retrying, setRetrying] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const hydratedUrlState = useRef(false);

  const selectedCandidate =
    candidates.find((candidate) => candidate.id === selectedId) ??
    (selectedExtra?.id === selectedId ? selectedExtra : null);
  const comparisonCandidates = compareIds.flatMap((id) => {
    const candidate =
      comparisonMap[id] ??
      candidates.find((item) => item.id === id) ??
      (selectedExtra?.id === id ? selectedExtra : null);
    return candidate ? [candidate] : [];
  });

  const updateUrl = useCallback(
    (changes: Record<string, string | number | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "" || value === "all" || value === "score") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      }
      const queryString = params.toString();
      router.replace(queryString ? `?${queryString}` : "?", { scroll: false });
      return params;
    },
    [router, searchParams],
  );

  const fetchPage = useCallback(
    async (next: {
      page?: number;
      query?: string;
      filter?: CandidateFilter;
      sort?: CandidateSort;
    }) => {
      const nextPage = next.page ?? page;
      const nextQuery = next.query ?? query;
      const nextFilter = next.filter ?? filter;
      const nextSort = next.sort ?? sort;
      setLoading(true);
      setLoadError(false);
      try {
        const params = new URLSearchParams({ page: String(nextPage) });
        if (nextQuery.trim()) params.set("q", nextQuery.trim());
        if (nextFilter !== "all") params.set("filter", nextFilter);
        if (nextSort !== "score") params.set("sort", nextSort);
        const response = await fetch(`/api/hr/jobs/${postingId}/applicants?${params.toString()}`);
        if (!response.ok) {
          setLoadError(true);
          return;
        }
        const data = await response.json();
        const nextCandidates = data.candidates as Candidate[];
        setCandidates(nextCandidates);
        setComparisonMap((previous) => ({
          ...previous,
          ...Object.fromEntries(nextCandidates.map((candidate) => [candidate.id, candidate])),
        }));
        setScreenedOut(data.screenedOut);
        setTotal(data.pagination.total);
        setPage(data.pagination.page);
      } finally {
        setLoading(false);
      }
    },
    [filter, page, postingId, query, sort],
  );

  const applyDiscovery = useCallback(
    (next: {
      page?: number;
      query?: string;
      filter?: CandidateFilter;
      sort?: CandidateSort;
    }) => {
      const nextPage = next.page ?? page;
      const nextQuery = next.query ?? query;
      const nextFilter = next.filter ?? filter;
      const nextSort = next.sort ?? sort;
      updateUrl({
        page: nextPage > 1 ? nextPage : null,
        q: nextQuery.trim() || null,
        filter: nextFilter,
        sort: nextSort,
      });
      void fetchPage({
        page: nextPage,
        query: nextQuery,
        filter: nextFilter,
        sort: nextSort,
      });
    },
    [fetchPage, filter, page, query, sort, updateUrl],
  );

  useEffect(() => {
    if (!hydratedUrlState.current) {
      hydratedUrlState.current = true;
      return;
    }
    const urlQuery = searchParams.get("q") ?? "";
    const urlFilter = parseCandidateFilter(searchParams.get("filter"));
    const urlSort = parseCandidateSort(searchParams.get("sort"));
    const urlPage = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    setQuery(urlQuery);
    setFilter(urlFilter);
    setSort(urlSort);

    const params = new URLSearchParams({ page: String(urlPage) });
    if (urlQuery) params.set("q", urlQuery);
    if (urlFilter !== "all") params.set("filter", urlFilter);
    if (urlSort !== "score") params.set("sort", urlSort);
    setLoadError(false);
    void fetch(`/api/hr/jobs/${postingId}/applicants?${params.toString()}`)
      .then((response) => {
        if (!response.ok) setLoadError(true);
        return response.ok ? response.json() : null;
      })
      .then((data) => {
        if (!data) return;
        const nextCandidates = data.candidates as Candidate[];
        setCandidates(nextCandidates);
        setComparisonMap((previous) => ({
          ...previous,
          ...Object.fromEntries(nextCandidates.map((candidate) => [candidate.id, candidate])),
        }));
        setScreenedOut(data.screenedOut);
        setTotal(data.pagination.total);
        setPage(data.pagination.page);
      });
  }, [postingId, searchParams]);

  const selectCandidate = useCallback(
    (id: string | null) => {
      const selected = candidates.find((candidate) => candidate.id === id) ?? null;
      if (selected) setSelectedExtra(selected);
      updateUrl({ candidate: id, view: view === "full" ? "full" : null });
    },
    [candidates, updateUrl, view],
  );

  const openFullCandidate = useCallback(
    (id: string) => {
      const selected = candidates.find((candidate) => candidate.id === id) ?? selectedExtra;
      if (selected?.id === id) setSelectedExtra(selected);
      updateUrl({ candidate: id, view: "full" });
    },
    [candidates, selectedExtra, updateUrl],
  );

  const toggleCompare = useCallback(
    (candidate: Candidate) => {
      const exists = compareIds.includes(candidate.id);
      if (!exists && compareIds.length >= 3) return;
      const nextIds = exists
        ? compareIds.filter((id) => id !== candidate.id)
        : [...compareIds, candidate.id];
      setComparisonMap((previous) => ({ ...previous, [candidate.id]: candidate }));
      updateUrl({
        compare: nextIds.length ? nextIds.join(",") : null,
        view: view === "compare" && nextIds.length < 2 ? null : view === "compare" ? "compare" : null,
      });
    },
    [compareIds, updateUrl, view],
  );

  const retryAllFailed = useCallback(async () => {
    setRetrying(true);
    try {
      await fetch(`/api/hr/jobs/${postingId}/retry-all`, { method: "POST" });
    } finally {
      setRetrying(false);
    }
  }, [postingId]);

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
          if (payload.eventType !== "UPDATE" || !payload.new) return;
          const updated = payload.new as Candidate;
          if (updated.job_posting_id !== postingId) return;
          setCandidates((previous) =>
            previous.map((candidate) =>
              candidate.id === updated.id ? { ...candidate, ...updated } : candidate,
            ),
          );
          setSelectedExtra((previous) =>
            previous?.id === updated.id ? { ...previous, ...updated } : previous,
          );
          setComparisonMap((previous) =>
            previous[updated.id]
              ? { ...previous, [updated.id]: { ...previous[updated.id], ...updated } }
              : previous,
          );
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
          if (payload.eventType !== "INSERT" || !payload.new) return;
          const inserted = payload.new as Candidate;
          if (inserted.job_posting_id !== postingId) return;
          if (inserted.status === "rejected_screening") {
            setScreenedOut((previous) => [
              {
                id: inserted.id,
                full_name: inserted.full_name,
                created_at: inserted.created_at,
                status: inserted.status,
              },
              ...previous,
            ]);
            return;
          }
          const queryMatches =
            !query.trim() || inserted.full_name.toLowerCase().includes(query.trim().toLowerCase());
          if (queryMatches && candidateMatchesFilter(inserted, filter)) {
            setCandidates((previous) => [inserted, ...previous]);
            setTotal((previous) => previous + 1);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, filter, postingId, query]);

  const updateCandidate = useCallback((id: string, updates: Partial<Candidate>) => {
    setCandidates((previous) =>
      previous.map((candidate) => (candidate.id === id ? { ...candidate, ...updates } : candidate)),
    );
    setSelectedExtra((previous) => (previous?.id === id ? { ...previous, ...updates } : previous));
    setComparisonMap((previous) =>
      previous[id] ? { ...previous, [id]: { ...previous[id], ...updates } } : previous,
    );
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const chipCounts = counts ?? {
    all: total,
    new: 0,
    recommend: 0,
    review: 0,
    reject: 0,
    mismatch: 0,
  };
  const filters: { value: CandidateFilter; label: string; count: number }[] = [
    { value: "all", label: t("hr.applicants.chip.all"), count: chipCounts.all },
    { value: "new", label: t("hr.applicants.chip.new"), count: chipCounts.new },
    { value: "recommend", label: t("hr.applicants.chip.top_picks"), count: chipCounts.recommend },
    { value: "review", label: t("hr.applicants.chip.review"), count: chipCounts.review },
    { value: "mismatch", label: t("hr.applicants.chip.below_requirements"), count: chipCounts.mismatch },
    { value: "reject", label: t("hr.applicants.chip.below_bar"), count: chipCounts.reject },
  ];

  const list = (
    <CandidateList
      candidates={candidates}
      screenedOut={screenedOut}
      selectedId={selectedId}
      onSelect={selectCandidate}
      page={page}
      totalPages={totalPages}
      onPageChange={(nextPage) => applyDiscovery({ page: nextPage })}
      loading={loading}
      failedCount={failedCount}
      retrying={retrying}
      onRetryAll={retryAllFailed}
      compareIds={compareIds}
      onToggleCompare={toggleCompare}
    />
  );

  const detail = selectedCandidate ? (
    <CandidateDetail
      candidate={selectedCandidate}
      postingTitle={postingTitle}
      appUrl={appUrl}
      templates={templates}
      onClose={() => selectCandidate(null)}
      onOpenFullPage={() => openFullCandidate(selectedCandidate.id)}
      onUpdate={updateCandidate}
    />
  ) : (
    <div className="flex h-full items-center justify-center p-8 text-center text-sm text-[var(--color-text-muted)]">
      {t("applicants.select_prompt")}
    </div>
  );

  if (view === "compare" && comparisonCandidates.length > 0) {
    return (
      <CandidateComparison
        candidates={comparisonCandidates}
        onBack={() => updateUrl({ view: null })}
        onOpen={(id) => openFullCandidate(id)}
      />
    );
  }

  if (view === "full" && selectedCandidate) {
    return (
      <CandidateDetail
        candidate={selectedCandidate}
        postingTitle={postingTitle}
        appUrl={appUrl}
        templates={templates}
        onClose={() => {
          if (returnTo?.startsWith("/hr/")) {
            router.push(returnTo);
          } else {
            updateUrl({ view: null });
          }
        }}
        onUpdate={updateCandidate}
        fullPage
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className={selectedCandidate ? "hidden md:flex md:flex-col md:gap-3" : "flex flex-col gap-3"}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <form
            className="flex min-w-0 flex-1 gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              applyDiscovery({ page: 1, query });
            }}
          >
            <SearchField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => {
                setQuery("");
                applyDiscovery({ page: 1, query: "" });
              }}
              clearLabel={t("common.clear")}
              placeholder={t("applicants.search_placeholder")}
              aria-label={t("applicants.search_placeholder")}
              className="min-w-0 flex-1"
            />
            <Button type="submit" variant="secondary" aria-label={t("applicants.search_action")}>
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{t("applicants.search_action")}</span>
            </Button>
          </form>
          <label className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)]">
            <span className="hidden sm:inline">{t("applicants.sort.label")}</span>
            <select
              value={sort}
              onChange={(event) => {
                const nextSort = parseCandidateSort(event.target.value);
                setSort(nextSort);
                applyDiscovery({ page: 1, sort: nextSort });
              }}
              className="h-10 rounded-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)]"
            >
              <option value="score">{t("applicants.sort.score")}</option>
              <option value="newest">{t("applicants.sort.newest")}</option>
              <option value="oldest">{t("applicants.sort.oldest")}</option>
              <option value="name">{t("applicants.sort.name")}</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {filters.map((item) => (
            <FilterChip
              key={item.value}
              active={filter === item.value}
              count={item.count}
              onClick={() => {
                setFilter(item.value);
                applyDiscovery({ page: 1, filter: item.value });
              }}
            >
              {item.label}
            </FilterChip>
          ))}
        </div>
      </div>

      {compareIds.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-primary)] bg-[var(--color-primary-container)] px-3 py-2">
          <p className="text-sm font-medium text-[var(--color-on-primary-container)]">
            {t("applicants.compare.selected", { count: String(compareIds.length) })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="tonal"
              size="sm"
              disabled={compareIds.length < 2}
              onClick={() => updateUrl({ view: "compare" })}
            >
              <GitCompareArrows className="h-4 w-4" />
              {t("applicants.compare.action")}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => updateUrl({ compare: null, view: null })}>
              <X className="h-4 w-4" />
              {t("common.clear")}
            </Button>
          </div>
        </div>
      )}

      {loadError && (
        <Alert
          tone="danger"
          title={t("errors.load_failed")}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void fetchPage({ page, query, filter, sort })}
            >
              {t("common.retry")}
            </Button>
          }
        />
      )}

      <Panel className="flex min-h-0 flex-1 overflow-hidden">
        <div className={selectedCandidate ? "hidden min-h-0 flex-1 md:flex xl:w-[430px] xl:flex-none" : "flex min-h-0 flex-1 xl:w-[430px] xl:flex-none"}>
          {list}
        </div>
        <div className="hidden min-h-0 flex-1 border-l border-[var(--color-line)] xl:flex">
          {detail}
        </div>
        {selectedCandidate && (
          <div className="flex min-h-0 flex-1 md:hidden">
            <CandidateDetail
              candidate={selectedCandidate}
              postingTitle={postingTitle}
              appUrl={appUrl}
              templates={templates}
              onClose={() => selectCandidate(null)}
              onUpdate={updateCandidate}
              mobile
            />
          </div>
        )}
      </Panel>

      {isTablet && selectedCandidate && (
        <Sheet open onOpenChange={(open) => !open && selectCandidate(null)}>
          <SheetContent
            side="right"
            hideClose
            className="!max-w-[min(92vw,760px)] p-0"
            aria-label={selectedCandidate.full_name}
          >
            <SheetTitle className="sr-only">{selectedCandidate.full_name}</SheetTitle>
            <CandidateDetail
              candidate={selectedCandidate}
              postingTitle={postingTitle}
              appUrl={appUrl}
              templates={templates}
              onClose={() => selectCandidate(null)}
              onOpenFullPage={() => openFullCandidate(selectedCandidate.id)}
              onUpdate={updateCandidate}
              tablet
            />
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
