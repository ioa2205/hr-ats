export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { Panel, PanelHeader, PanelTitle, StatTile } from "@/components/hr/design";
import { funnelDrops, type FunnelDrop } from "@/lib/sourcing/summary";
import { FindCandidatesButton } from "@/components/hr/sourcing/find-candidates-button";
import { SourcingAutoRefresh } from "@/components/hr/sourcing/sourcing-auto-refresh";
import {
  SourcedCandidateCard,
  type SourcedCandidateCardProps,
} from "@/components/hr/sourcing/sourced-candidate-card";
import { availableSourcesForCompany } from "@/lib/sourcing/availability";
import { buildQueryText, joinKeywords } from "@/lib/sourcing/connectors/hh/connector";
import { hhAreaName } from "@/lib/sourcing/connectors/hh/areas";
import type { TranslationKey } from "@/lib/i18n/types";
import type { HardRequirement } from "@/types";
import type {
  DeepScore,
  NormalizedProfile,
  RequirementProfile,
  RequirementResult,
  SearchOverrides,
  SourceKind,
  SourcingStats,
  SourcingStatus,
} from "@/lib/sourcing/types";

const STATUS_KEY: Record<SourcingStatus, TranslationKey> = {
  queued: "sourcing.results.status.queued",
  running: "sourcing.results.status.running",
  completed: "sourcing.results.status.completed",
  partial: "sourcing.results.status.partial",
  failed: "sourcing.results.status.failed",
};

const SOURCE_KEY: Record<SourceKind, TranslationKey> = {
  internal_pool: "sourcing.results.source.internal_pool",
  hh: "sourcing.results.source.hh",
  telegram: "sourcing.results.source.telegram",
  linkedin_url: "sourcing.results.source.linkedin_url",
};

const DROP_REASON_KEY: Record<FunnelDrop["stage"], TranslationKey> = {
  dedup: "sourcing.results.drop.dedup",
  gate: "sourcing.results.drop.gate",
  score: "sourcing.results.drop.score",
  verify: "sourcing.results.drop.verify",
};

const DROP_KEPT_KEY: Record<FunnelDrop["stage"], TranslationKey> = {
  dedup: "sourcing.results.stat.deduped",
  gate: "sourcing.results.stat.gate_passed",
  score: "sourcing.results.stat.scored",
  verify: "sourcing.results.stat.verified",
};

const STATUS_TONE: Record<SourcingStatus, string> = {
  queued: "bg-bone text-ink-3 border-rule",
  running: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  partial: "bg-amber-50 text-amber-700 border-amber-200",
  failed: "bg-red-50 text-red-600 border-red-200",
};

export default async function SourcingResultsPage({
  params,
}: {
  params: Promise<{ id: string; searchId: string }>;
}) {
  const { id: jobId, searchId } = await params;
  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const admin = createAdminClient();

  const { data: search } = await admin
    .from("sourcing_searches")
    .select("*")
    .eq("id", searchId)
    .eq("company_id", companyId)
    .eq("job_posting_id", jobId)
    .maybeSingle();

  if (!search) notFound();

  const { data: job } = await admin
    .from("job_postings")
    .select("title, title_ru, title_uz, title_en, hard_requirements")
    .eq("id", jobId)
    .maybeSingle();

  const jobTitle = job
    ? pickLocalized({ ru: job.title_ru, uz: job.title_uz, en: job.title_en }, locale, job.title)
    : "—";
  const requirements = (job?.hard_requirements ?? []) as HardRequirement[];
  const labelById = new Map(
    requirements.map((req) => [
      req.id,
      pickLocalized({ ru: req.label_ru, uz: req.label_uz, en: req.label_en }, locale, req.label_ru),
    ]),
  );

  const { data: rows } = await admin
    .from("sourced_candidates")
    .select("*")
    .eq("sourcing_search_id", searchId)
    .order("rank", { ascending: true });

  const status = search.status as SourcingStatus;
  const stats = (search.stats ?? {}) as Partial<SourcingStats>;
  const isRunning = status === "queued" || status === "running";
  const drops = funnelDrops(stats);
  const showFunnel = !isRunning && (stats.fetched ?? 0) > 0;
  const degradedSources = stats.degraded_sources ?? [];
  const hasHhDegraded = degradedSources.includes("hh");

  // --- "Search configuration" panel: what was searched + with what terms -----
  // search_overrides is a post-Docker column absent from the generated types.
  const overrides = ((search as { search_overrides?: unknown }).search_overrides ??
    null) as SearchOverrides | null;
  const profile = (search.requirement_profile ?? null) as RequirementProfile | null;
  const searchedSources = (search.sources ?? []) as SourceKind[];
  const perSource = stats.per_source ?? {};
  const degradedBySource = new Map(
    (stats.degraded_details ?? []).map((d) => [d.source, d]),
  );
  const aiKeywords = profile?.search_keywords ?? [];
  const overrodeKeywords = (overrides?.keywords?.length ?? 0) > 0;
  // The exact hh `text` query that ran (override wins, else the AI-derived query).
  const hhQuery = overrodeKeywords
    ? joinKeywords(overrides!.keywords!)
    : profile
      ? buildQueryText(profile)
      : "";
  const hhRegionLabel =
    overrides?.area_id === undefined
      ? t("sourcing.config.region_default", locale)
      : overrides.area_id === null
        ? t("sourcing.config.region_all", locale)
        : (hhAreaName(overrides.area_id) ?? overrides.area_id);
  const showHhConfig = searchedSources.includes("hh");

  // Re-run dialog defaults — pre-fill from this run so "Adjust & re-run" is sticky.
  const availableSources = await availableSourcesForCompany(companyId);
  const rerunKeywords = overrides?.keywords ?? aiKeywords;

  const cards: SourcedCandidateCardProps[] = (rows ?? []).map((row) => {
    const profile = (row.profile ?? {}) as NormalizedProfile;
    const reqResults = (row.requirement_results ?? []) as RequirementResult[];
    const breakdown = (row.score_breakdown ?? null) as DeepScore | null;
    return {
      sourcedId: row.id,
      rank: row.rank ?? 0,
      fullName: profile.full_name ?? "—",
      headline: profile.headline ?? null,
      sourceLabel: t(SOURCE_KEY[row.source as SourceKind], locale),
      score: typeof row.score === "number" ? row.score : 0,
      confidence: breakdown?.confidence ?? 0,
      verified: row.verified === true,
      promoted: row.promoted_candidate_id != null,
      requirements: reqResults.map((rr) => ({
        id: rr.requirement_id,
        label: labelById.get(rr.requirement_id) ?? rr.requirement_id,
        met: rr.met,
        evidence: rr.evidence,
        confidence: rr.confidence,
      })),
      axes: (breakdown?.axes ?? []).map((axis) => ({
        key: axis.axis,
        score: axis.score,
        evidence: axis.evidence,
      })),
      gaps: breakdown?.gaps ?? [],
      risks: breakdown?.risks ?? [],
      evidenceFields: (profile.fields ?? []).map((f) => ({
        field: f.field,
        value: f.value,
        evidence: f.evidence,
      })),
    };
  });

  type CountKey = "fetched" | "deduped" | "gate_passed" | "scored" | "verified" | "shortlisted";
  const statTiles: Array<{ key: CountKey; labelKey: TranslationKey }> = [
    { key: "fetched", labelKey: "sourcing.results.stat.fetched" },
    { key: "deduped", labelKey: "sourcing.results.stat.deduped" },
    { key: "gate_passed", labelKey: "sourcing.results.stat.gate_passed" },
    { key: "scored", labelKey: "sourcing.results.stat.scored" },
    { key: "verified", labelKey: "sourcing.results.stat.verified" },
    { key: "shortlisted", labelKey: "sourcing.results.stat.shortlisted" },
  ];

  return (
    <div>
      <SourcingAutoRefresh active={isRunning} />

      {/* Breadcrumb */}
      <div className="text-ink-5 mb-2 flex items-center gap-1.5 text-[11px] font-medium">
        <Link
          href={`/hr/jobs/${jobId}`}
          className="text-ink-4 hover:bg-bone-2 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 text-[11.5px]"
        >
          <ChevronLeft className="h-3 w-3" />
          {jobTitle}
        </Link>
        <span>/</span>
        <span className="text-ink-3 truncate">{t("sourcing.results.breadcrumb", locale)}</span>
      </div>

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-ink text-[26px] font-semibold leading-[1.1] tracking-[-0.018em]">
            {t("sourcing.results.title", locale)}
          </h1>
          <p className="text-ink-4 mt-1.5 max-w-[640px] text-[13px]">
            {t("sourcing.results.subtitle", locale)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <span
              className={`inline-flex items-center rounded-[4px] border px-2 py-0.5 text-[11.5px] font-medium ${STATUS_TONE[status]}`}
            >
              {t("sourcing.results.status_label", locale)}: {t(STATUS_KEY[status], locale)}
            </span>
            {search.cost_usd != null && (
              <span
                className="text-ink-5 text-[11px]"
                style={{ fontFamily: "var(--font-tez-mono)" }}
              >
                {t("sourcing.results.cost_label", locale)} ${Number(search.cost_usd).toFixed(4)} ·{" "}
                {(search.input_tokens ?? 0) + (search.output_tokens ?? 0)} tok
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <FindCandidatesButton
            jobId={jobId}
            variant="secondary"
            label={t("sourcing.results.rerun", locale)}
            availableSources={availableSources}
            defaultSources={searchedSources}
            defaultKeywords={rerunKeywords}
            defaultAreaId={overrides?.area_id}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="mb-5 grid grid-cols-3 gap-2 md:grid-cols-6">
        {statTiles.map((tile) => (
          <StatTile
            key={tile.key}
            label={t(tile.labelKey, locale)}
            value={stats[tile.key] ?? 0}
          />
        ))}
      </div>

      {/* Search configuration — which sources ran and with what terms. Built
          purely from persisted data; honest about per-source counts + failures. */}
      {searchedSources.length > 0 && (
        <Panel className="mb-5">
          <PanelHeader>
            <PanelTitle>{t("sourcing.config.searched_title", locale)}</PanelTitle>
          </PanelHeader>
          <div className="space-y-3 px-5 py-3.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-ink-4 mr-1 text-[11.5px]">
                {t("sourcing.config.sources_label", locale)}:
              </span>
              {searchedSources.map((src) => {
                const degraded = degradedBySource.get(src);
                const count = perSource[src];
                return (
                  <span
                    key={src}
                    className={`inline-flex items-center gap-1.5 rounded-[4px] border px-2 py-0.5 text-[11.5px] ${
                      degraded
                        ? "border-red-200 bg-red-50 text-red-600"
                        : "border-rule bg-bone text-ink-3"
                    }`}
                  >
                    {t(SOURCE_KEY[src], locale)}
                    {degraded ? (
                      <span className="text-[11px]">
                        {[degraded.status, degraded.code].filter(Boolean).join(" ") ||
                          t("sourcing.config.source_failed", locale)}
                      </span>
                    ) : (
                      <span
                        className="text-ink-5"
                        style={{ fontFamily: "var(--font-tez-mono)" }}
                      >
                        {count ?? 0}
                      </span>
                    )}
                  </span>
                );
              })}
            </div>

            {showHhConfig && (
              <div className="space-y-1.5 text-[12px]">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-ink-4 text-[11.5px]">
                    {t("sourcing.config.keywords_used", locale)}:
                  </span>
                  <span className="text-ink-2" style={{ fontFamily: "var(--font-tez-mono)" }}>
                    {hhQuery || "—"}
                  </span>
                  <span className="text-ink-5 text-[11px]">
                    {overrodeKeywords
                      ? t("sourcing.config.tag_yours", locale)
                      : t("sourcing.config.tag_ai", locale)}
                  </span>
                </div>
                {overrodeKeywords && aiKeywords.length > 0 && (
                  <div className="text-ink-5 text-[11px]">
                    {t("sourcing.config.ai_suggested", locale)}: {joinKeywords(aiKeywords)}
                  </div>
                )}
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-ink-4 text-[11.5px]">
                    {t("sourcing.config.region_label", locale)}:
                  </span>
                  <span className="text-ink-2">{hhRegionLabel}</span>
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* Funnel breakdown — honest, derived purely from the stage counts: how
          many candidates were excluded at each rung and why. No fabrication. */}
      {showFunnel && (
        <Panel className="mb-5">
          <PanelHeader>
            <PanelTitle>{t("sourcing.results.funnel_title", locale)}</PanelTitle>
            <span className="text-ink-5 text-[11.5px]">
              {t("sourcing.results.funnel_subtitle", locale)}
            </span>
          </PanelHeader>
          <ul className="divide-rule divide-y">
            {drops.map((rung) => (
              <li
                key={rung.stage}
                className="flex items-center justify-between gap-4 px-5 py-2.5 text-[12.5px]"
              >
                <span className="text-ink-3">
                  {t(DROP_KEPT_KEY[rung.stage], locale)}
                  <span className="text-ink-5 ml-2" style={{ fontFamily: "var(--font-tez-mono)" }}>
                    {rung.entered} → {rung.kept}
                  </span>
                </span>
                {rung.dropped > 0 ? (
                  <span className="text-ink-4 text-right text-[11.5px]">
                    {t("sourcing.results.drop_count", locale, { count: String(rung.dropped) })}{" "}
                    {t(DROP_REASON_KEY[rung.stage], locale)}
                  </span>
                ) : (
                  <span className="text-ink-5 text-[11.5px]">
                    {t("sourcing.results.drop_none", locale)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {status === "partial" && (
        <div className="mb-4 rounded-[6px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-800">
          <div>{t("sourcing.results.partial_note", locale)}</div>
          {degradedSources.length > 0 && (
            <div className="mt-1">
              {t("sourcing.results.degraded_note", locale, {
                sources: degradedSources.map((s) => t(SOURCE_KEY[s], locale)).join(", "),
              })}
            </div>
          )}
          {hasHhDegraded && (
            <div className="mt-1">{t("sourcing.results.hh_reconnect_hint", locale)}</div>
          )}
        </div>
      )}
      {status === "failed" && (
        <div className="mb-4 rounded-[6px] border border-red-200 bg-red-50 px-4 py-2.5 text-[12.5px] text-red-700">
          {t("sourcing.results.failed_hint", locale)}
        </div>
      )}
      {isRunning && (
        <div className="border-rule bg-bone text-ink-3 mb-4 rounded-[6px] border px-4 py-2.5 text-[12.5px]">
          {t("sourcing.results.running_hint", locale)}
        </div>
      )}

      {/* Results */}
      <Panel>
        <PanelHeader>
          <PanelTitle count={cards.length}>{t("sourcing.results.title", locale)}</PanelTitle>
          {cards.length > 0 && (
            <span className="text-ink-5 text-[11.5px]">
              {t("sourcing.results.count_summary", locale, { count: String(cards.length) })}
            </span>
          )}
        </PanelHeader>
        {cards.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-ink-2 text-[14px] font-semibold">
              {isRunning ? t("sourcing.results.status.running", locale) : t("sourcing.results.empty_title", locale)}
            </div>
            {!isRunning && (
              <p className="text-ink-5 mx-auto mt-1.5 max-w-[420px] text-[12.5px]">
                {t("sourcing.results.empty_hint", locale)}
              </p>
            )}
          </div>
        ) : (
          <div>
            {cards.map((card) => (
              <SourcedCandidateCard key={card.sourcedId} {...card} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
