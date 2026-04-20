"use client";

import { useState, type ReactNode } from "react";
import { FileText, Users, Layers, Link2, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n/provider";

export type JobDetailTabId = "overview" | "applicants" | "pipeline" | "share" | "settings";

interface JobDetailTabsProps {
  candidateCount: number;
  overview: ReactNode;
  applicants: ReactNode;
  pipeline: ReactNode;
  share: ReactNode;
  settings: ReactNode;
}

export function JobDetailTabs({
  candidateCount,
  overview,
  applicants,
  pipeline,
  share,
  settings,
}: JobDetailTabsProps) {
  const [tab, setTab] = useState<JobDetailTabId>("overview");
  const { t } = useTranslation();

  const tabs = [
    { id: "overview" as const, label: t("hr.job.tabs.overview"), icon: FileText },
    { id: "applicants" as const, label: t("hr.job.tabs.applicants"), icon: Users, count: candidateCount },
    { id: "pipeline" as const, label: t("hr.job.tabs.pipeline"), icon: Layers },
    { id: "share" as const, label: t("hr.job.tabs.share"), icon: Link2 },
    { id: "settings" as const, label: t("hr.job.tabs.settings"), icon: SettingsIcon },
  ];

  return (
    <>
      <div className="border-rule mb-4 flex items-center gap-[2px] border-b">
        {tabs.map((ti) => {
          const Icon = ti.icon;
          const active = tab === ti.id;
          return (
            <button
              key={ti.id}
              type="button"
              onClick={() => setTab(ti.id)}
              className={cn(
                "-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-medium tracking-[-0.005em] transition-colors",
                active
                  ? "text-ink border-ink font-semibold"
                  : "text-ink-4 hover:text-ink border-transparent",
              )}
            >
              <Icon className="h-3 w-3" />
              {ti.label}
              {ti.count != null && (
                <span
                  className={cn(
                    "text-[10px]",
                    active ? "text-ink-3" : "text-ink-5",
                  )}
                  style={{ fontFamily: "var(--font-tez-mono)" }}
                >
                  {ti.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "overview" && overview}
      {tab === "applicants" && applicants}
      {tab === "pipeline" && pipeline}
      {tab === "share" && share}
      {tab === "settings" && settings}
    </>
  );
}
