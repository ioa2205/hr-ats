export const dynamic = "force-dynamic";

import { Activity } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { EmptyState, Panel } from "@/components/ui";
import { getLocale, t } from "@/lib/i18n";
import type { Locale, TranslationKey } from "@/lib/i18n/types";

const PAGE_SIZE = 100;

function computeSince24h(): string {
  return new Date(Date.now() - 24 * 3600 * 1000).toISOString();
}

function actionLabelKey(action: string): TranslationKey {
  const map: Record<string, TranslationKey> = {
    "job.created": "hr.dashboard.activity.action.job_created",
    "job.updated": "hr.dashboard.activity.action.job_updated",
    "job.closed": "hr.dashboard.activity.action.job_closed",
    "job.reopened": "hr.dashboard.activity.action.job_reopened",
    "candidate.applied": "hr.dashboard.activity.action.applied",
    "candidate.invited": "hr.dashboard.activity.action.invited",
    "candidate.rejected": "hr.dashboard.activity.action.rejected",
  };
  return map[action] ?? "hr.dashboard.activity.action.generic";
}

function relativeTime(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMin = Math.floor((now - d.getTime()) / 60000);
  if (diffMin < 1) return t("hr.time.now", locale);
  if (diffMin < 60) return t("hr.time.m_ago", locale, { n: String(diffMin) });
  const hrs = Math.floor(diffMin / 60);
  if (hrs < 24) return t("hr.time.h_ago", locale, { n: String(hrs) });
  const days = Math.floor(hrs / 24);
  return t("hr.time.days_ago", locale, { days: String(days) });
}

export default async function ActivityPage() {
  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const admin = createAdminClient();

  const since24h = computeSince24h();
  const [{ data: events }, { count: eventsLast24h }] = await Promise.all([
    admin
      .from("audit_log")
      .select("id,actor,action,entity_type,entity_id,created_at,metadata")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false })
      .limit(PAGE_SIZE),
    admin
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .gte("created_at", since24h),
  ]);

  const list = events ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="data-mono mb-1.5 text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
          {t("hr.activity.eyebrow", locale, { count: String(eventsLast24h ?? 0) })}
        </p>
        <h1 className="text-[clamp(1.5rem,4vw,1.85rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[var(--color-text)]">
          {t("hr.activity.title", locale)}
        </h1>
      </div>

      <Panel>
        {list.length === 0 ? (
          <EmptyState
            icon={<Activity />}
            title={t("hr.dashboard.activity.empty", locale)}
            compact
          />
        ) : (
          <div>
            {list.map((a) => (
              <div
                key={a.id}
                className="flex gap-3.5 border-b border-[var(--color-line)] px-4 py-3.5 text-[13px] last:border-b-0 sm:px-[18px]"
              >
                <span className="data-mono w-20 shrink-0 text-[11px] text-[var(--color-text-subtle)]">
                  {relativeTime(a.created_at, locale)}
                </span>
                <div className="flex-1">
                  <strong className="font-semibold text-[var(--color-text)]">{a.actor}</strong>{" "}
                  <span className="text-[var(--color-text-muted)]">
                    {t(actionLabelKey(a.action), locale)}
                  </span>{" "}
                  <strong className="text-[var(--color-text)]">{a.entity_type}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
