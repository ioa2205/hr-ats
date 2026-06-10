export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Pencil,
  Users,
  ChevronLeft,
  Building2,
  MapPin,
  Check,
  ArrowRight,
  Radar,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { canWrite as canWriteQuota } from "@/lib/companies/quota";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  Button,
  Badge,
  Avatar,
  AIFitScore,
} from "@/components/ui";
import { PublicLinkBlock, SharePreview } from "@/components/hr/design";
import { JobDetailTabs } from "@/components/hr/job-detail-tabs";
import { StatusToggleButton } from "@/components/hr/status-toggle-button";
import { FindCandidatesButton } from "@/components/hr/sourcing/find-candidates-button";
import { availableSourcesForCompany } from "@/lib/sourcing/availability";
import { ShareButtons } from "@/components/hr/share-buttons";
import { JobDescription } from "@/components/candidate/job-description";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import type { HardRequirement } from "@/types";
import { cn } from "@/lib/utils";

function daysAgoText(iso: string, locale: Locale) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return t("hr.time.today", locale);
  if (days === 1) return t("hr.time.yesterday", locale);
  return t("hr.time.days_ago", locale, { days: String(days) });
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const supabaseAdmin = createAdminClient();

  const { data: job } = await supabaseAdmin
    .from("job_postings")
    .select("*")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();

  if (!job) notFound();

  const writable = await canWriteQuota(companyId);
  const availableSources = await availableSourcesForCompany(companyId);
  const publicUrl = `${env.APP_URL}/apply/${job.public_token}`;
  const requirements = (job.hard_requirements ?? []) as HardRequirement[];

  // Resolve title + description to the viewer's locale (fallback to legacy column).
  const shownTitle = pickLocalized(
    { ru: job.title_ru, uz: job.title_uz, en: job.title_en },
    locale,
    job.title,
  );
  const shownDescription = pickLocalized(
    { ru: job.description_ru, uz: job.description_uz, en: job.description_en },
    locale,
    job.description,
  );

  // Counts + top picks + owner + stages
  const [
    countsRes,
    pendingRes,
    invitedRes,
    rejectedRes,
    topRes,
    failedRes,
    topList,
    ownerRes,
  ] = await Promise.all([
    supabaseAdmin
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .eq("job_posting_id", id),
    supabaseAdmin
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .eq("job_posting_id", id)
      .in("status", ["pending_analysis", "analyzing"]),
    supabaseAdmin
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .eq("job_posting_id", id)
      .eq("status", "invited"),
    supabaseAdmin
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .eq("job_posting_id", id)
      .in("status", ["rejected", "rejected_screening"]),
    supabaseAdmin
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .eq("job_posting_id", id)
      .gte("match_score", 80)
      .in("status", ["analyzed", "invited"]),
    supabaseAdmin
      .from("candidates")
      .select("*", { count: "exact", head: true })
      .eq("job_posting_id", id)
      .eq("status", "analysis_failed"),
    supabaseAdmin
      .from("candidates")
      .select(
        "id,full_name,match_score,one_line_summary,one_line_summary_uz,one_line_summary_en,status",
      )
      .eq("job_posting_id", id)
      .gte("match_score", 80)
      .in("status", ["analyzed", "invited"])
      .order("match_score", { ascending: false })
      .limit(3),
    job.created_by
      ? supabaseAdmin.from("profiles").select("id,full_name,email").eq("id", job.created_by).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const total = countsRes.count ?? 0;
  const newCount = pendingRes.count ?? 0;
  const invitedCount = invitedRes.count ?? 0;
  const rejectedCount = rejectedRes.count ?? 0;
  const topCount = topRes.count ?? 0;
  const failedCount = failedRes.count ?? 0;

  const owner = ownerRes.data;
  const ownerName = owner?.full_name ?? null;

  // Recent activity for this job
  const { data: activity } = await supabaseAdmin
    .from("audit_log")
    .select("actor,action,created_at")
    .eq("company_id", companyId)
    .eq("entity_id", id)
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: company } = await supabaseAdmin
    .from("companies")
    .select("name, logo_url, default_locale")
    .eq("id", companyId)
    .maybeSingle();

  const ogLocales: string[] = [];
  if ((job.title_ru ?? "").trim()) ogLocales.push("RU");
  if ((job.title_uz ?? "").trim()) ogLocales.push("UZ");
  if ((job.title_en ?? "").trim()) ogLocales.push("EN");
  if (ogLocales.length === 0) ogLocales.push((company?.default_locale ?? locale).toUpperCase());

  const appliedPillKey =
    locale === "ru" && total === 1
      ? "apply.og.applied_pill_one"
      : "apply.og.applied_pill_other";
  const appliedLabel = t(appliedPillKey, locale, { count: String(total) });
  const ogEyebrow = t("apply.og.eyebrow", locale);

  const OverviewTab = (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-5">
        {/* Funnel */}
        <div className="grid grid-cols-2 gap-2.5 md:grid-cols-5">
          <Stat label={t("hr.job.funnel.total", locale)} value={total} />
          <Stat label={t("hr.job.funnel.new", locale)} value={newCount} tone={newCount > 0 ? "accent" : "default"} />
          <Stat label={t("hr.job.funnel.invited", locale)} value={invitedCount} />
          <Stat label={t("hr.job.funnel.rejected", locale)} value={rejectedCount} />
          <Stat label={t("hr.job.funnel.errors", locale)} value={failedCount} tone={failedCount > 0 ? "danger" : "default"} />
        </div>

        {/* Description */}
        {shownDescription && shownDescription.trim().length > 0 && (
          <Panel>
            <PanelHeader>
              <PanelTitle>{t("hr.job.description_label", locale)}</PanelTitle>
            </PanelHeader>
            <JobDescription text={shownDescription} className="px-5 py-4" />
          </Panel>
        )}

        {/* Requirements */}
        {requirements.length > 0 && (
          <Panel>
            <PanelHeader>
              <PanelTitle count={requirements.length}>
                {t("hr.job.requirements_label", locale)}
              </PanelTitle>
            </PanelHeader>
            <ul className="m-0 list-none divide-y divide-[var(--color-line)] p-0">
              {requirements.map((req) => (
                <li key={req.id} className="flex items-center gap-3 px-5 py-3">
                  <span
                    aria-hidden
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-success-container)]"
                  >
                    <Check className="h-3 w-3 text-[var(--color-success)]" strokeWidth={2.5} />
                  </span>
                  <span className="flex-1 text-[13.5px] leading-[1.45] text-[var(--color-text)]">
                    {pickLocalized(
                      { ru: req.label_ru, uz: req.label_uz, en: req.label_en },
                      locale,
                      req.label_ru,
                    )}
                  </span>
                  {req.type === "number" && req.min_value != null && (
                    <span className="data-mono shrink-0 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--color-text-muted)]">
                      {t("hr.jobs.detail.min_value", locale, { value: String(req.min_value) })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {/* Skills */}
        {job.required_skills.length > 0 && (
          <Panel>
            <PanelHeader>
              <PanelTitle count={job.required_skills.length}>
                {t("hr.job.skills_label", locale)}
              </PanelTitle>
            </PanelHeader>
            <div className="flex flex-wrap gap-1.5 px-5 py-4">
              {job.required_skills.map((skill: string) => (
                <span
                  key={skill}
                  className="data-mono rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-2 py-0.5 text-[11.5px] text-[var(--color-text-muted)]"
                >
                  {skill}
                </span>
              ))}
            </div>
          </Panel>
        )}

        {/* Top picks preview */}
        <Panel>
          <PanelHeader>
            <PanelTitle count={topCount}>{t("hr.job.top_picks_title", locale)}</PanelTitle>
            <Link
              href={`/hr/jobs/${id}/applicants`}
              className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-1 text-[11.5px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
            >
              {t("hr.dashboard.view_all", locale)}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </PanelHeader>
          {(topList.data ?? []).length === 0 ? (
            <p className="px-5 py-8 text-center text-[12px] text-[var(--color-text-subtle)]">
              {t("hr.dashboard.top_picks.empty", locale)}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {(topList.data ?? []).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/hr/jobs/${id}/applicants?candidate=${c.id}`}
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-[var(--color-surface-subtle)]"
                  >
                    <Avatar name={c.full_name} accent size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-semibold text-[var(--color-text)]">
                        {c.full_name}
                      </div>
                      <div className="mt-[2px] line-clamp-1 text-[12px] text-[var(--color-text-muted)]">
                        {pickLocalized(
                          {
                            ru: c.one_line_summary,
                            uz: c.one_line_summary_uz,
                            en: c.one_line_summary_en,
                          },
                          locale,
                          c.one_line_summary ?? "—",
                        )}
                      </div>
                    </div>
                    <AIFitScore
                      score={c.match_score ?? 0}
                      label={t("hr.job.top_picks_title", locale)}
                      variant="compact"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* Right rail */}
      <aside className="flex flex-col gap-4">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t("hr.job.owner_title", locale)}</PanelTitle>
          </PanelHeader>
          <div className="p-4">
            {ownerName ? (
              <div className="flex items-center gap-3">
                <Avatar name={ownerName} size="lg" />
                <div className="min-w-0">
                  <div className="truncate text-[13.5px] font-semibold text-[var(--color-text)]">
                    {ownerName}
                  </div>
                  <div className="data-mono truncate text-[11px] text-[var(--color-text-subtle)]">
                    {owner?.email ?? ""}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-[12px] text-[var(--color-text-subtle)]">—</div>
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>{t("hr.job.public_link_title", locale)}</PanelTitle>
          </PanelHeader>
          <div className="p-4">
            <PublicLinkBlock url={publicUrl} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>{t("hr.dashboard.activity.title", locale)}</PanelTitle>
          </PanelHeader>
          {(activity ?? []).length === 0 ? (
            <p className="px-4 py-6 text-center text-[12px] text-[var(--color-text-subtle)]">
              {t("hr.dashboard.activity.empty", locale)}
            </p>
          ) : (
            <ul className="divide-y divide-[var(--color-line)]">
              {(activity ?? []).map((a, i) => (
                <li key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12px]">
                  <span className="truncate text-[var(--color-text)]">{a.actor}</span>
                  <span className="data-mono shrink-0 text-[10.5px] text-[var(--color-text-subtle)]">
                    {daysAgoText(a.created_at, locale)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </aside>
    </div>
  );

  const ApplicantsTab = (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Button asChild>
        <Link href={`/hr/jobs/${id}/applicants`}>
          {t("hr.job.open_ranked_list", locale)} <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  );

  const stages: { key: string; count: number; accent: boolean }[] = [
    { key: "applied", count: total, accent: false },
    { key: "top", count: topCount, accent: true },
    { key: "invited", count: invitedCount, accent: false },
    { key: "rejected", count: rejectedCount, accent: false },
  ];

  const PipelineTab = (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t("hr.dashboard.pipeline.title", locale)}</PanelTitle>
      </PanelHeader>
      <div className="grid grid-cols-2 gap-2.5 p-5 md:grid-cols-4">
        {stages.map((s) => (
          <Stat
            key={s.key}
            label={t(`hr.dashboard.pipeline.stage.${s.key}` as TranslationKey, locale)}
            value={s.count}
            tone={s.accent && s.count > 0 ? "accent" : "default"}
          />
        ))}
      </div>
    </Panel>
  );

  const ShareTab = (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-4">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t("hr.job.share.preview_label", locale)}</PanelTitle>
          </PanelHeader>
          <div className="flex flex-col gap-3 p-5">
            <p className="text-[12.5px] text-[var(--color-text-muted)]">
              {t("hr.job.share.preview_help", locale)}
            </p>
            <div className="max-w-[560px]">
              <SharePreview
                title={shownTitle}
                company={company?.name ?? ""}
                logoUrl={company?.logo_url ?? null}
                appliedCount={total}
                locales={ogLocales}
                eyebrow={ogEyebrow}
                appliedLabel={appliedLabel}
              />
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader>
            <PanelTitle>{t("hr.job.share.public_page", locale)}</PanelTitle>
          </PanelHeader>
          <div className="p-5">
            <p className="mb-3.5 text-[13px] text-[var(--color-text-muted)]">
              {t("hr.job.share.trilingual_note", locale)}
            </p>
            <SectionLabel>URL</SectionLabel>
            <PublicLinkBlock url={publicUrl} layout="inline" />
            <div className="mt-5">
              <SectionLabel>{t("hr.job.share.share_label", locale)}</SectionLabel>
              <ShareButtons url={publicUrl} title={shownTitle} company={company?.name ?? ""} />
            </div>
            <div className="data-mono mt-5 text-[10.5px] tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
              {t("hr.job.share.seo_note", locale)}
            </div>
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader>
          <PanelTitle>{t("hr.job.share.qr_title", locale)}</PanelTitle>
        </PanelHeader>
        <div className="flex flex-col items-center p-5">
          <PublicLinkBlock url={publicUrl} />
          <div className="data-mono mt-2.5 text-[10.5px] tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
            {t("hr.job.share.print_hint", locale)}
          </div>
        </div>
      </Panel>
    </div>
  );

  const SettingsTab = (
    <p className="px-6 py-12 text-center text-[13px] text-[var(--color-text-muted)]">
      {t("hr.job.settings_coming", locale)}
    </p>
  );

  const statusActive = job.status === "active";

  return (
    <div className="flex flex-col gap-5">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-text-subtle)]">
        <Link
          href="/hr/jobs"
          className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] px-1.5 py-1 text-[11.5px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
        >
          <ChevronLeft className="h-3 w-3" />
          {t("hr.nav.jobs", locale)}
        </Link>
        <span>/</span>
        <span className="truncate text-[var(--color-text-muted)]">{shownTitle}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-[clamp(1.5rem,4vw,1.85rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
            {shownTitle}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Badge tone={statusActive ? "success" : "neutral"} variant={statusActive ? "dot" : "default"}>
              {t(statusActive ? "hr.job.status.active" : "hr.job.status.closed", locale)}
            </Badge>
            <span className="hidden h-3.5 w-px bg-[var(--color-line)] sm:block" aria-hidden />
            <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)]">
              <Building2 className="h-3 w-3 text-[var(--color-text-subtle)]" />
              {t("hr.job.company_label", locale)}
            </span>
            <span className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-text-muted)]">
              <MapPin className="h-3 w-3 text-[var(--color-text-subtle)]" />
              {t("hr.job.remote_label", locale)}
            </span>
            <span className="data-mono text-[11px] text-[var(--color-text-subtle)]">
              {t("hr.job.posted_prefix", locale)} {daysAgoText(job.created_at, locale)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {writable ? (
            <Button asChild variant="secondary">
              <Link href={`/hr/jobs/${id}/edit`}>
                <Pencil className="h-4 w-4" />
                {t("hr.jobs.edit", locale)}
              </Link>
            </Button>
          ) : (
            <Button variant="secondary" disabled title={t("quota.subscription_inactive_short", locale)}>
              <Pencil className="h-4 w-4" />
              {t("hr.jobs.edit", locale)}
            </Button>
          )}
          <StatusToggleButton jobId={id} status={job.status} canWrite={writable} />
          <Button asChild variant="secondary">
            <Link href={`/hr/jobs/${id}/sourcing`}>
              <Radar className="h-4 w-4" />
              {t("sourcing.runs.nav_label", locale)}
            </Link>
          </Button>
          <FindCandidatesButton jobId={id} variant="secondary" disabled={!writable} availableSources={availableSources} />
          <Button asChild>
            <Link href={`/hr/jobs/${id}/applicants`}>
              <Users className="h-4 w-4" />
              {total} {t("hr.jobs.detail.candidates_heading", locale).toLowerCase()}
            </Link>
          </Button>
        </div>
      </div>

      <JobDetailTabs
        candidateCount={total}
        overview={OverviewTab}
        applicants={ApplicantsTab}
        pipeline={PipelineTab}
        share={ShareTab}
        settings={SettingsTab}
      />
    </div>
  );
}

// --- small presentational helpers ---

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "accent" | "danger";
}) {
  const valueColor =
    tone === "accent"
      ? "text-[var(--color-accent)]"
      : tone === "danger"
        ? "text-[var(--color-danger)]"
        : "text-[var(--color-text)]";
  return (
    <div className="flex flex-col gap-1 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-3">
      <span className="text-[11px] font-medium text-[var(--color-text-muted)]">{label}</span>
      <span className={cn("text-[26px] font-bold leading-none tracking-[-0.02em] tabular-nums", valueColor)}>
        {value}
      </span>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2.5 data-mono text-[10.5px] font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
      {children}
    </div>
  );
}
