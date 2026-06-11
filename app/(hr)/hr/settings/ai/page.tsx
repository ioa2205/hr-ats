export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getAiSettings } from "@/lib/ai-settings.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INTERVIEW_QUESTIONS_MODEL_TAG } from "@/lib/gemini/interview-questions-types";
import { getLocale, t } from "@/lib/i18n";
import { Panel, PanelHeader, PanelTitle } from "@/components/ui";
import { SettingsPageHeader } from "@/components/hr/settings/settings-page-header";
import { AiSettingsForm } from "@/components/hr/settings/ai/ai-settings-form";

export default async function AiSettingsPage() {
  const { companyId } = await requireCompanyAccess();
  const locale = await getLocale();
  const settings = await getAiSettings(companyId);

  const admin = createAdminClient();
  const since = thirtyDaysAgoIso();
  const [cvCount, questionCount] = await Promise.all([
    admin
      .from("ai_processing_attempts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "success")
      .gte("created_at", since)
      .neq("model", INTERVIEW_QUESTIONS_MODEL_TAG),
    admin
      .from("ai_processing_attempts")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "success")
      .eq("model", INTERVIEW_QUESTIONS_MODEL_TAG)
      .gte("created_at", since),
  ]);

  return (
    <section>
      <SettingsPageHeader
        title={t("hr.settings.ai.title", locale)}
        sub={t("hr.settings.ai.subtitle", locale)}
      />

      <AiSettingsForm initial={settings} />

      <Panel className="mt-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.ai.usage_title", locale)}</PanelTitle>
        </PanelHeader>
        <div className="divide-y divide-[var(--color-line)]">
          <UsageRow label={t("hr.settings.ai.usage_cv", locale)} value={cvCount.count ?? 0} />
          <UsageRow
            label={t("hr.settings.ai.usage_questions", locale)}
            value={questionCount.count ?? 0}
          />
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] px-4 py-2.5">
          <span className="text-[11.5px] text-[var(--color-text-subtle)]">
            {t("hr.settings.ai.region_label", locale)} · {t("hr.settings.ai.region_value", locale)}
          </span>
          <Link
            href="/privacy#ai"
            className="text-[11.5px] text-[var(--color-text-muted)] underline underline-offset-2 hover:text-[var(--color-text)]"
          >
            {t("hr.settings.ai.privacy_link", locale)}
          </Link>
        </div>
      </Panel>
    </section>
  );
}

function thirtyDaysAgoIso(): string {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
}

function UsageRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="text-[13px] font-semibold text-[var(--color-text)]">{label}</div>
      <div className="data-mono text-[12.5px] tabular-nums text-[var(--color-text-muted)]">
        {value}
      </div>
    </div>
  );
}
