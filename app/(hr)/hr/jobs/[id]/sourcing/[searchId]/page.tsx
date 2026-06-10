export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Radar } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import { Alert, Badge, EmptyState, Panel, PanelHeader, PanelTitle } from "@/components/ui";
import type { BadgeTone } from "@/components/ui";
import { funnelDrops, type FunnelDrop } from "@/lib/sourcing/summary";
import { safeHttpUrl } from "@/lib/utils";
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
  RequirementResult,
  RequirementProfile,
  SearchOverrides,
  SourcedContact,
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

const STATUS_TONE: Record<SourcingStatus, BadgeTone> = {
  queued: "neutral",
  running: "info",
  completed: "success",
  partial: "warning",
  failed: "danger",
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
    const contact = (row.contact ?? {}) as Partial<SourcedContact>;
    return {
      sourcedId: row.id,
      rank: row.rank ?? 0,
      fullName: profile.full_name ?? "—",
      headline: profile.headline ?? null,
      sourceLabel: t(SOURCE_KEY[row.source as SourceKind], locale),
      profileUrl: safeHttpUrl(contact.profile_url),
      phone: contact.phone ?? null,
      telegram: contact.telegram ?? null,
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
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-subtle)]">
        <Link
          href={`/hr/jobs/${jobId}`}
          className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-1 text-[11.5px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="h-3 w-3" />
          {jobTitle}
        </Link>
        <span aria-hidden>/</span>
        <span className="truncate text-[var(--color-text)]">{t("sourcing.results.breadcrumb", locale)}</span>
      </div>

      {/* Header */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.5rem,4vw,1.65rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
            {t("sourcing.results.title", locale)}
          </h1>
          <p className="mt-1.5 max-w-[640px] text-[13px] text-[var(--color-text-muted)]">
            {t("sourcing.results.subtitle", locale)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge tone={STATUS_TONE[status]} variant={isRunning ? "pulse" : "default"}>
              {t("sourcing.results.status_label", locale)}: {t(STATUS_KEY[status], locale)}
            </Badge>
            {search.cost_usd != null && (
              <span className="data-mono text-[11px] text-[var(--color-text-subtle)]">
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

      {/* Stats — funnel counts at a glance */}
      <div className="mb-5 grid grid-cols-3 gap-2 md:grid-cols-6">
        {statTiles.map((tile) => (
          <div
            key={tile.key}
            className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-3"
          >
            <span className="text-[11px] font-medium text-[var(--color-text-muted)]">
              {t(tile.labelKey, locale)}
            </span>
            <span className="text-[22px] font-bold leading-none tracking-[-0.02em] tabular-nums text-[var(--color-text)]">
              {stats[tile.key] ?? 0}
            </span>
          </div>
        ))}
      </div>

      {/* Search configuration — which sources ran and with what terms. Built
          purely from persisted data; honest about per-source counts + failures. */}
      {searchedSources.length > 0 && (
        <Panel className="mb-5">
          <PanelHeader>
            <PanelTitle>{t("sourcing.config.searched_title", locale)}</PanelTitle>
          </PanelHeader>
          <div className="space-y-3 px-4 py-3.5 sm:px-5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11.5px] text-[var(--color-text-muted)]">
                {t("sourcing.config.sources_label", locale)}:
              </span>
              {searchedSources.map((src) => {
                const degraded = degradedBySource.get(src);
                const count = perSource[src];
                return (
                  <Badge key={src} tone={degraded ? "danger" : "neutral"}>
                    {t(SOURCE_KEY[src], locale)}
                    {degraded ? (
                      <span className="text-[11px]">
                        {[degraded.status, degraded.code].filter(Boolean).join(" ") ||
                          t("sourcing.config.source_failed", locale)}
                      </span>
                    ) : (
                      <span className="data-mono">{count ?? 0}</span>
                    )}
                  </Badge>
                );
              })}
            </div>

            {showHhConfig && (
              <div className="space-y-1.5 text-[12px]">
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[11.5px] text-[var(--color-text-muted)]">
                    {t("sourcing.config.keywords_used", locale)}:
                  </span>
                  <span className="data-mono text-[var(--color-text)]">{hhQuery || "—"}</span>
                  <span className="text-[11px] text-[var(--color-text-subtle)]">
                    {overrodeKeywords
                      ? t("sourcing.config.tag_yours", locale)
                      : t("sourcing.config.tag_ai", locale)}
                  </span>
                </div>
                {overrodeKeywords && aiKeywords.length > 0 && (
                  <div className="text-[11px] text-[var(--color-text-subtle)]">
                    {t("sourcing.config.ai_suggested", locale)}: {joinKeywords(aiKeywords)}
                  </div>
                )}
                <div className="flex flex-wrap items-baseline gap-1.5">
                  <span className="text-[11.5px] text-[var(--color-text-muted)]">
                    {t("sourcing.config.region_label", locale)}:
                  </span>
                  <span className="text-[var(--color-text)]">{hhRegionLabel}</span>
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
            <span className="text-[11.5px] text-[var(--color-text-subtle)]">
              {t("sourcing.results.funnel_subtitle", locale)}
            </span>
          </PanelHeader>
          <ul className="divide-y divide-[var(--color-line)]">
            {drops.map((rung) => (
              <li
                key={rung.stage}
                className="flex items-center justify-between gap-4 px-4 py-2.5 text-[12.5px] sm:px-5"
              >
                <span className="text-[var(--color-text)]">
                  {t(DROP_KEPT_KEY[rung.stage], locale)}
                  <span className="data-mono ml-2 text-[var(--color-text-subtle)]">
                    {rung.entered} → {rung.kept}
                  </span>
                </span>
                {rung.dropped > 0 ? (
                  <span className="text-right text-[11.5px] text-[var(--color-text-muted)]">
                    {t("sourcing.results.drop_count", locale, { count: String(rung.dropped) })}{" "}
                    {t(DROP_REASON_KEY[rung.stage], locale)}
                  </span>
                ) : (
                  <span className="text-[11.5px] text-[var(--color-text-subtle)]">
                    {t("sourcing.results.drop_none", locale)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {status === "partial" && (
        <Alert tone="warning" className="mb-4" title={t("sourcing.results.partial_note", locale)}>
          {(degradedSources.length > 0 || hasHhDegraded) && (
            <div className="flex flex-col gap-1">
              {degradedSources.length > 0 && (
                <span>
                  {t("sourcing.results.degraded_note", locale, {
                    sources: degradedSources.map((s) => t(SOURCE_KEY[s], locale)).join(", "),
                  })}
                </span>
              )}
              {hasHhDegraded && <span>{t("sourcing.results.hh_reconnect_hint", locale)}</span>}
            </div>
          )}
        </Alert>
      )}
      {status === "failed" && (
        <Alert tone="danger" className="mb-4">
          {t("sourcing.results.failed_hint", locale)}
        </Alert>
      )}
      {isRunning && (
        <Alert tone="info" className="mb-4">
          {t("sourcing.results.running_hint", locale)}
        </Alert>
      )}

      {/* Results */}
      <Panel>
        <PanelHeader>
          <PanelTitle count={cards.length}>{t("sourcing.results.title", locale)}</PanelTitle>
          {cards.length > 0 && (
            <span className="text-[11.5px] text-[var(--color-text-subtle)]">
              {t("sourcing.results.count_summary", locale, { count: String(cards.length) })}
            </span>
          )}
        </PanelHeader>
        {cards.length === 0 ? (
          <EmptyState
            icon={<Radar />}
            title={
              isRunning
                ? t("sourcing.results.status.running", locale)
                : t("sourcing.results.empty_title", locale)
            }
            description={isRunning ? undefined : t("sourcing.results.empty_hint", locale)}
            compact
          />
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
