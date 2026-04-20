export const dynamic = "force-dynamic";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { Panel } from "@/components/hr/design";
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
    <div>
      <div className="text-ink-5 mb-1.5 flex items-center gap-1.5 text-[11px] font-medium">
        {t("hr.activity.eyebrow", locale, { count: String(eventsLast24h ?? 0) })}
      </div>
      <h1 className="text-ink mb-6 text-[28px] font-semibold leading-[1.1] tracking-[-0.018em]">
        {t("hr.activity.title", locale)}.
      </h1>

      <Panel>
        {list.length === 0 ? (
          <div className="text-ink-5 px-6 py-12 text-center text-[13px]">
            {t("hr.dashboard.activity.empty", locale)}
          </div>
        ) : (
          <div>
            {list.map((a) => (
              <div
                key={a.id}
                className="border-rule flex gap-3.5 border-b px-[18px] py-3.5 text-[13px] last:border-b-0"
              >
                <span
                  className="text-ink-5 w-20 shrink-0 text-[11px]"
                  style={{ fontFamily: "var(--font-tez-mono)" }}
                >
                  {relativeTime(a.created_at, locale)}
                </span>
                <div className="flex-1">
                  <strong className="text-ink font-semibold">{a.actor}</strong>{" "}
                  <span className="text-ink-4">
                    {t(actionLabelKey(a.action), locale)}
                  </span>{" "}
                  <strong className="text-ink">{a.entity_type}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
