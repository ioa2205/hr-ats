export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireCompanyAccess } from "@/lib/auth/guards";
import { getAiSettings } from "@/lib/ai-settings.server";
import { createAdminClient } from "@/lib/supabase/admin";
import { INTERVIEW_QUESTIONS_MODEL_TAG } from "@/lib/gemini/interview-questions-types";
import { getLocale, t } from "@/lib/i18n";
import { Panel, PanelHeader, PanelTitle, SettingsHeader } from "@/components/hr/design";
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
      <SettingsHeader
        title={t("hr.settings.ai.title", locale)}
        sub={t("hr.settings.ai.subtitle", locale)}
      />

      <AiSettingsForm initial={settings} />

      <Panel>
        <PanelHeader>
          <PanelTitle>{t("hr.settings.ai.usage_title", locale)}</PanelTitle>
        </PanelHeader>
        <div className="divide-rule divide-y">
          <UsageRow
            label={t("hr.settings.ai.usage_cv", locale)}
            value={cvCount.count ?? 0}
          />
          <UsageRow
            label={t("hr.settings.ai.usage_questions", locale)}
            value={questionCount.count ?? 0}
          />
        </div>
        <div className="border-rule flex items-center justify-between gap-3 border-t px-[18px] py-2.5">
          <span className="text-ink-5 text-[11.5px]">
            {t("hr.settings.ai.region_label", locale)} · {t("hr.settings.ai.region_value", locale)}
          </span>
          <Link
            href="/privacy#ai"
            className="text-ink-3 hover:text-ink text-[11.5px] underline underline-offset-2"
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
    <div className="flex items-center justify-between gap-3 px-[18px] py-3">
      <div className="text-ink text-[13px] font-semibold">{label}</div>
      <div
        className="text-ink-2 text-[12.5px] tabular-nums"
        style={{ fontFamily: "var(--font-tez-mono)" }}
      >
        {value}
      </div>
    </div>
  );
}
