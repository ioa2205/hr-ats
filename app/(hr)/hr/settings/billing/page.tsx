export const dynamic = "force-dynamic";

import { Lock, Check } from "lucide-react";
import { format } from "date-fns";
import { ru as ruLocale, enUS, uz } from "date-fns/locale";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { canGenerateQuestions, canScheduleInterview, getQuotaState } from "@/lib/companies/quota";
import { getLocale, t } from "@/lib/i18n";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import { Badge, Panel, PanelHeader, PanelTitle, Progress, type BadgeTone } from "@/components/ui";
import { SettingsPageHeader } from "@/components/hr/settings/settings-page-header";
import { cn } from "@/lib/utils";
import { CancelButton, UpgradeButton } from "@/components/hr/settings/billing/billing-dialogs";

const MOST_POPULAR = true;

const dateLocaleByLocale: Record<Locale, typeof ruLocale> = {
  ru: ruLocale,
  uz,
  en: enUS,
};

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ intent?: string }>;
}) {
  const { companyId } = await requireCompanyAccess();
  const sp = await searchParams;
  const locale = await getLocale();
  const quota = await getQuotaState(companyId);

  if (!quota) {
    return (
      <section>
        <SettingsPageHeader title={t("quota.billing_title", locale)} />
        <p className="text-[13px] text-[var(--color-text-muted)]">{t("common.error", locale)}</p>
      </section>
    );
  }

  const admin = createAdminClient();
  const [interviewBookings, aiQuestions, pendingUpgradeResult] = await Promise.all([
    canScheduleInterview(companyId),
    canGenerateQuestions(companyId),
    admin
      .from("subscription_upgrade_requests")
      .select("id")
      .eq("company_id", companyId)
      .eq("status", "pending")
      .maybeSingle(),
  ]);
  const hasPendingUpgrade = Boolean(pendingUpgradeResult.data);
  const autoOpenUpgrade = sp.intent === "pro";

  const trialDate = format(new Date(quota.trialEndsAt), "d MMMM yyyy", {
    locale: dateLocaleByLocale[locale],
  });

  const isPro = quota.status === "active";
  const isExpired = quota.status === "expired";
  const isCancelled = quota.status === "cancelled";

  return (
    <section>
      <SettingsPageHeader
        title={t("quota.billing_title", locale)}
        sub={t("quota.billing_desc", locale)}
      />

      <PlanCard
        quota={quota}
        locale={locale}
        trialDate={trialDate}
        status={quota.status}
        hasPendingUpgrade={hasPendingUpgrade}
        autoOpenUpgrade={autoOpenUpgrade}
      />

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.billing.usage.title", locale)}</PanelTitle>
        </PanelHeader>
        <div className="divide-y divide-[var(--color-line)]">
          <UsageRow
            label={t("hr.settings.billing.usage.cv_analyses", locale)}
            used={quota.cvQuotaUsed}
            limit={isPro ? null : quota.cvQuotaLimit}
            locale={locale}
          />
          <UsageRow
            label={t("hr.settings.billing.usage.active_jobs", locale)}
            used={quota.activeJobCount}
            limit={isPro ? null : quota.jobQuotaLimit}
            locale={locale}
          />
          <UsageRow
            label={t("hr.settings.billing.usage.interview_bookings", locale)}
            used={interviewBookings.used}
            limit={isPro ? null : interviewBookings.limit}
            locale={locale}
          />
          <UsageRow
            label={t("hr.settings.billing.usage.interview_questions", locale)}
            used={aiQuestions.used}
            limit={isPro ? null : aiQuestions.limit}
            locale={locale}
          />
        </div>
      </Panel>

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.billing.compare.title", locale)}</PanelTitle>
        </PanelHeader>
        <div className="grid gap-0 sm:grid-cols-2">
          <ComparisonColumn
            name={t("hr.settings.billing.compare.trial_name", locale)}
            features={[
              t("hr.settings.billing.compare.trial_f1", locale),
              t("hr.settings.billing.compare.trial_f2", locale),
              t("hr.settings.billing.compare.trial_f3", locale),
              t("hr.settings.billing.compare.trial_f4", locale),
            ]}
            highlighted={false}
          />
          <ComparisonColumn
            name={t("hr.settings.billing.compare.pro_name", locale)}
            features={[
              t("hr.settings.billing.compare.pro_f1", locale),
              t("hr.settings.billing.compare.pro_f2", locale),
              t("hr.settings.billing.compare.pro_f3", locale),
              t("hr.settings.billing.compare.pro_f4", locale),
              t("hr.settings.billing.compare.pro_f5", locale),
            ]}
            highlighted
            ribbon={MOST_POPULAR ? t("hr.settings.billing.compare.pro_popular", locale) : null}
          />
        </div>
        {!isPro && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--color-line)] px-4 py-3">
            {(isExpired || isCancelled) && <CancelStatus status={quota.status} locale={locale} />}
            <UpgradeButton hasPendingRequest={hasPendingUpgrade} />
          </div>
        )}
      </Panel>

      {isPro && (
        <Panel className="mb-4">
          <PanelHeader>
            <PanelTitle>{t("hr.settings.billing.cta.cancel", locale)}</PanelTitle>
          </PanelHeader>
          <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] text-[var(--color-text-muted)]">
              {t("hr.settings.billing.cancel.dialog_body", locale)}
            </p>
            <CancelButton />
          </div>
        </Panel>
      )}

      <Panel>
        <PanelHeader>
          <PanelTitle>{t("hr.settings.billing.invoices.title", locale)}</PanelTitle>
        </PanelHeader>
        <div className="data-mono px-4 py-8 text-center text-[11.5px] text-[var(--color-text-subtle)]">
          {t("hr.settings.billing.invoices.empty", locale)}
        </div>
      </Panel>
    </section>
  );
}

function PlanCard({
  quota,
  locale,
  trialDate,
  status,
  hasPendingUpgrade,
  autoOpenUpgrade,
}: {
  quota: { status: string; daysRemaining: number; canWrite: boolean };
  locale: Locale;
  trialDate: string;
  status: string;
  hasPendingUpgrade: boolean;
  autoOpenUpgrade: boolean;
}) {
  const isPro = status === "active";
  const isTrial = status === "trialing";
  const isExpired = status === "expired";
  const isCancelled = status === "cancelled";
  const isReadOnly = !quota.canWrite;

  const badgeKey: TranslationKey = isPro
    ? "hr.settings.billing.plan.pro_badge"
    : isExpired
      ? "hr.settings.billing.plan.expired_badge"
      : isCancelled
        ? "hr.settings.billing.plan.cancelled_badge"
        : "hr.settings.billing.plan.trial_badge";

  const trialPct = isTrial
    ? Math.max(0, Math.min(100, Math.round(((14 - quota.daysRemaining) / 14) * 100)))
    : 0;

  return (
    <Panel className="mb-4">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={isPro ? "accent" : isExpired ? "danger" : "neutral"}>
              {t(badgeKey, locale)}
            </Badge>
            {isReadOnly && (
              <Badge tone="danger">
                <Lock className="h-3 w-3" aria-hidden="true" />
                {t("quota.readonly_title", locale)}
              </Badge>
            )}
          </div>
          <div className="mt-2 text-[20px] font-semibold tracking-[-0.015em] text-[var(--color-text)]">
            {isPro
              ? t("quota.plan_pro", locale)
              : isExpired
                ? t("quota.plan_expired", locale)
                : isCancelled
                  ? t("quota.plan_cancelled", locale)
                  : t("quota.plan_trial", locale)}
          </div>
          <div className="mt-1 text-[12.5px] text-[var(--color-text-muted)]">
            {isPro
              ? t("hr.settings.billing.plan.renews_on", locale, { date: trialDate })
              : isTrial
                ? t("hr.settings.billing.plan.days_remaining", locale, {
                    days: String(quota.daysRemaining),
                    date: trialDate,
                  })
                : t("hr.settings.billing.plan.read_only", locale)}
          </div>
          {isTrial && (
            <div className="mt-3 max-w-[360px]">
              <Progress
                value={trialPct}
                tone="accent"
                size="sm"
                label={t("hr.settings.billing.plan.trial_badge", locale)}
              />
            </div>
          )}
        </div>
        {!isPro && (
          <UpgradeButton hasPendingRequest={hasPendingUpgrade} autoOpen={autoOpenUpgrade} />
        )}
      </div>
    </Panel>
  );
}

function UsageRow({
  label,
  used,
  limit,
  locale,
}: {
  label: string;
  used: number;
  limit: number | null;
  locale: Locale;
}) {
  if (limit === null || !Number.isFinite(limit)) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="text-[13px] font-semibold text-[var(--color-text)]">{label}</div>
        <div className="data-mono text-[11.5px] text-[var(--color-text-muted)]">
          {used} · {t("hr.settings.billing.usage.unlimited", locale)}
        </div>
      </div>
    );
  }

  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const state: "ok" | "warn" | "over" = pct >= 100 ? "over" : pct >= 80 ? "warn" : "ok";

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[13px] font-semibold text-[var(--color-text)]">{label}</div>
        <div className="data-mono text-[11.5px] text-[var(--color-text-muted)]">
          {t("hr.settings.billing.usage.used_of", locale, {
            used: String(used),
            limit: String(limit),
          })}
        </div>
      </div>
      <div className="mt-2">
        <Progress
          value={Math.max(pct, used > 0 ? 2 : 0)}
          tone={state === "over" ? "danger" : state === "warn" ? "warning" : "primary"}
          size="sm"
          label={label}
        />
      </div>
    </div>
  );
}

function ComparisonColumn({
  name,
  features,
  highlighted,
  ribbon = null,
}: {
  name: string;
  features: string[];
  highlighted: boolean;
  ribbon?: string | null;
}) {
  return (
    <div
      className={cn(
        "relative px-5 py-5",
        highlighted ? "bg-[var(--color-accent-container)]/40" : "bg-[var(--color-surface)]",
      )}
    >
      {ribbon && (
        <div className="data-mono absolute top-3 right-3 rounded-[var(--radius-sm)] bg-[var(--color-accent)] px-1.5 py-[1px] text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[var(--color-on-accent)]">
          {ribbon}
        </div>
      )}
      <div className="text-[14px] font-semibold text-[var(--color-text)]">{name}</div>
      <ul className="mt-3 flex flex-col gap-1.5">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[12.5px] text-[var(--color-text-muted)]">
            <Check
              className={cn(
                "mt-[3px] h-3.5 w-3.5 shrink-0",
                highlighted ? "text-[var(--color-accent)]" : "text-[var(--color-text-subtle)]",
              )}
              aria-hidden="true"
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CancelStatus({ status, locale }: { status: string; locale: Locale }) {
  const labelKey: TranslationKey =
    status === "expired"
      ? "hr.settings.billing.plan.expired_badge"
      : "hr.settings.billing.plan.cancelled_badge";
  const tone: BadgeTone = "danger";
  return (
    <Badge tone={tone}>
      <Lock className="h-3 w-3" aria-hidden="true" />
      {t(labelKey, locale)}
    </Badge>
  );
}
