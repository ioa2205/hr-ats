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
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/env";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { canWrite as canWriteQuota } from "@/lib/companies/quota";
import {
  Panel,
  PanelHeader,
  PanelTitle,
  SectionH,
  StatusPill,
  StatTile,
  Avatar,
  ScoreMini,
  TezButton,
  PublicLinkBlock,
  SharePreview,
} from "@/components/hr/design";
import { JobDetailTabs } from "@/components/hr/job-detail-tabs";
import { StatusToggleButton } from "@/components/hr/status-toggle-button";
import { FindCandidatesButton } from "@/components/hr/sourcing/find-candidates-button";
import { ShareButtons } from "@/components/hr/share-buttons";
import { JobDescription } from "@/components/candidate/job-description";
import { getLocale, t } from "@/lib/i18n";
import { pickLocalized } from "@/lib/i18n/pick-localized";
import type { HardRequirement } from "@/types";

function daysAgoText(
  iso: string,
  locale: ReturnType<typeof getLocale> extends Promise<infer X> ? X : never,
) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return t("hr.time.today", locale);
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
    <div
      className="grid gap-6"
      style={{ gridTemplateColumns: "minmax(0, 1fr) 320px" }}
    >
      <div className="flex flex-col gap-5">
        {/* Funnel */}
        <div className="grid gap-2 grid-cols-2 md:grid-cols-5">
          <StatTile label={t("hr.job.funnel.total", locale)} value={total} />
          <StatTile
            label={t("hr.job.funnel.new", locale)}
            value={newCount}
            accent={newCount > 0 ? "persimmon" : "ink"}
          />
          <StatTile label={t("hr.job.funnel.invited", locale)} value={invitedCount} />
          <StatTile label={t("hr.job.funnel.rejected", locale)} value={rejectedCount} />
          <StatTile
            label={t("hr.job.funnel.errors", locale)}
            value={failedCount}
            accent={failedCount > 0 ? "red" : "ink"}
          />
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
            <ul className="m-0 list-none p-0">
              {requirements.map((req) => (
                <li
                  key={req.id}
                  className="border-rule flex items-center gap-3 border-b px-5 py-3 last:border-b-0"
                >
                  <span
                    aria-hidden
                    className="border-rule-2 bg-bone flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                  >
                    <Check className="text-ink-3 h-3 w-3" strokeWidth={2.5} />
                  </span>
                  <span className="text-ink-2 flex-1 text-[13.5px] leading-[1.45]">
                    {pickLocalized(
                      { ru: req.label_ru, uz: req.label_uz, en: req.label_en },
                      locale,
                      req.label_ru,
                    )}
                  </span>
                  {req.type === "number" && req.min_value != null && (
                    <span
                      className="border-rule bg-bone text-ink-4 shrink-0 rounded-[3px] border px-1.5 py-0.5 text-[11px]"
                      style={{ fontFamily: "var(--font-tez-mono)" }}
                    >
                      {t("hr.jobs.detail.min_value", locale, {
                        value: String(req.min_value),
                      })}
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
                  className="border-rule bg-bone text-ink-3 rounded-[4px] border px-2 py-0.5 text-[11.5px]"
                  style={{ fontFamily: "var(--font-tez-mono)" }}
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
            <PanelTitle count={topCount}>
              {t("hr.job.top_picks_title", locale)}
            </PanelTitle>
            <Link
              href={`/hr/jobs/${id}/applicants`}
              className="text-ink-4 hover:text-ink hover:bg-bone-2 flex items-center gap-1.5 rounded-[4px] px-1.5 py-1 text-[11.5px]"
            >
              {t("hr.dashboard.view_all", locale)}
              <ArrowRight className="h-3 w-3" />
            </Link>
          </PanelHeader>
          {(topList.data ?? []).length === 0 ? (
            <div className="text-ink-5 px-5 py-8 text-center text-[12px]">
              {t("hr.dashboard.top_picks.empty", locale)}
            </div>
          ) : (
            <div>
              {(topList.data ?? []).map((c) => (
                <Link
                  key={c.id}
                  href={`/hr/jobs/${id}/applicants?candidate=${c.id}`}
                  className="border-rule hover:bg-bone flex items-center gap-3 border-b px-5 py-3 transition-colors last:border-b-0"
                >
                  <Avatar name={c.full_name} persimmon />
                  <div className="min-w-0 flex-1">
                    <div className="text-ink text-[13.5px] font-semibold">
                      {c.full_name}
                    </div>
                    <div className="text-ink-4 mt-[2px] line-clamp-1 text-[12px]">
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
                  <ScoreMini score={c.match_score ?? 0} persimmon />
                </Link>
              ))}
            </div>
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
              <>
                <div className="flex items-center gap-3">
                  <Avatar name={ownerName} size="lg" />
                  <div>
                    <div className="text-[13.5px] font-semibold">{ownerName}</div>
                    <div
                      className="text-ink-5 text-[11px]"
                      style={{ fontFamily: "var(--font-tez-mono)" }}
                    >
                      {owner?.email ?? ""}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-ink-5 text-[12px]">—</div>
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
            <div className="text-ink-5 px-4 py-6 text-center text-[12px]">
              {t("hr.dashboard.activity.empty", locale)}
            </div>
          ) : (
            <div>
              {(activity ?? []).map((a, i) => (
                <div
                  key={i}
                  className="border-rule flex items-center justify-between border-t px-4 py-2.5 text-[12px] first:border-t-0"
                >
                  <span className="text-ink-2 truncate">{a.actor}</span>
                  <span
                    className="text-ink-5 text-[10.5px]"
                    style={{ fontFamily: "var(--font-tez-mono)" }}
                  >
                    {daysAgoText(a.created_at, locale)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </aside>
    </div>
  );

  const ApplicantsTab = (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <Link
        href={`/hr/jobs/${id}/applicants`}
        className="bg-ink text-paper shadow-tez-1 hover:bg-ink-2 inline-flex h-[34px] items-center gap-1.5 rounded-[4px] px-3.5 text-[13px] font-medium"
      >
        {t("hr.job.open_ranked_list", locale)} <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );

  const stages = [
    { label: t("hr.dashboard.pipeline.stage.applied", locale), count: total, accent: "ink" as const },
    { label: t("hr.dashboard.pipeline.stage.top", locale), count: topCount, accent: "persimmon" as const },
    { label: t("hr.dashboard.pipeline.stage.invited", locale), count: invitedCount, accent: "ink" as const },
    { label: t("hr.dashboard.pipeline.stage.rejected", locale), count: rejectedCount, accent: "ink" as const },
  ];

  const PipelineTab = (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t("hr.dashboard.pipeline.title", locale)}</PanelTitle>
      </PanelHeader>
      <div className="grid gap-2 p-5 grid-cols-2 md:grid-cols-4">
        {stages.map((s) => (
          <StatTile
            key={s.label}
            label={s.label}
            value={s.count}
            accent={s.count > 0 ? s.accent : "ink"}
          />
        ))}
      </div>
    </Panel>
  );

  const ShareTab = (
    <div className="grid gap-6" style={{ gridTemplateColumns: "minmax(0, 1fr) 320px" }}>
      <div className="flex flex-col gap-4">
        <Panel>
          <PanelHeader>
            <PanelTitle>{t("hr.job.share.preview_label", locale)}</PanelTitle>
          </PanelHeader>
          <div className="flex flex-col gap-3 p-5">
            <p className="text-ink-4 text-[12.5px]">
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
            <p className="text-ink-3 mb-3.5 text-[13px]">
              {t("hr.job.share.trilingual_note", locale)}
            </p>
            <SectionH title="URL" />
            <PublicLinkBlock url={publicUrl} layout="inline" />
            <div className="mt-5">
              <SectionH title={t("hr.job.share.share_label", locale)} />
              <ShareButtons
                url={publicUrl}
                title={shownTitle}
                company={company?.name ?? ""}
              />
            </div>
            <div
              className="text-ink-5 mt-5 text-[10.5px] uppercase tracking-[0.08em]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
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
          <div
            className="text-ink-5 mt-2.5 text-[10.5px] uppercase tracking-[0.08em]"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            {t("hr.job.share.print_hint", locale)}
          </div>
        </div>
      </Panel>
    </div>
  );

  const SettingsTab = (
    <div className="text-ink-4 px-6 py-12 text-center text-[13px]">
      {t("hr.job.settings_coming", locale)}
    </div>
  );

  return (
    <div>
      {/* Breadcrumb */}
      <div
        className="text-ink-5 mb-2 flex items-center gap-1.5 text-[11px] font-medium"
      >
        <Link
          href="/hr/jobs"
          className="text-ink-4 hover:bg-bone-2 inline-flex items-center gap-1 rounded-[4px] px-1.5 py-1 text-[11.5px]"
        >
          <ChevronLeft className="h-3 w-3" />
          {t("hr.nav.jobs", locale)}
        </Link>
        <span>/</span>
        <span className="text-ink-3 truncate">{shownTitle}</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 className="text-ink text-[28px] font-semibold leading-[1.1] tracking-[-0.018em]">
            {shownTitle}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <StatusPill
              status={job.status}
              label={t(
                job.status === "active" ? "hr.job.status.active" : "hr.job.status.closed",
                locale,
              )}
            />
            <span
              className="bg-rule h-3.5 w-px"
              aria-hidden
            />
            <span className="text-ink-3 flex items-center gap-1.5 text-[12.5px]">
              <Building2 className="text-ink-5 h-3 w-3" />
              {t("hr.job.company_label", locale)}
            </span>
            <span className="text-ink-3 flex items-center gap-1.5 text-[12.5px]">
              <MapPin className="text-ink-5 h-3 w-3" />
              {t("hr.job.remote_label", locale)}
            </span>
            <span
              className="text-ink-5 text-[11px]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            >
              {t("hr.job.posted_prefix", locale)} {daysAgoText(job.created_at, locale)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/hr/jobs/${id}/edit`}>
            <TezButton
              variant="secondary"
              leadingIcon={<Pencil className="h-3 w-3" />}
              disabled={!writable}
              title={!writable ? t("quota.subscription_inactive_short", locale) : undefined}
            >
              {t("hr.jobs.edit", locale)}
            </TezButton>
          </Link>
          <StatusToggleButton jobId={id} status={job.status} canWrite={writable} />
          <FindCandidatesButton jobId={id} variant="secondary" disabled={!writable} />
          <Link href={`/hr/jobs/${id}/applicants`}>
            <TezButton
              variant="primary"
              leadingIcon={<Users className="h-3 w-3" />}
            >
              {total}{" "}
              {t("hr.jobs.detail.candidates_heading", locale).toLowerCase()}
            </TezButton>
          </Link>
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
