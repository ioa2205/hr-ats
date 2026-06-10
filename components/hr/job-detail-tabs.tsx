"use client";

import { type ReactNode } from "react";
import { FileText, Users, Layers, Link2, Settings as SettingsIcon } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui";
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
  const { t } = useTranslation();

  const tabs = [
    { id: "overview" as const, label: t("hr.job.tabs.overview"), icon: FileText, content: overview },
    {
      id: "applicants" as const,
      label: t("hr.job.tabs.applicants"),
      icon: Users,
      count: candidateCount,
      content: applicants,
    },
    { id: "pipeline" as const, label: t("hr.job.tabs.pipeline"), icon: Layers, content: pipeline },
    { id: "share" as const, label: t("hr.job.tabs.share"), icon: Link2, content: share },
    { id: "settings" as const, label: t("hr.job.tabs.settings"), icon: SettingsIcon, content: settings },
  ];

  return (
    <Tabs defaultValue="overview">
      <TabsList className="overflow-x-auto">
        {tabs.map((ti) => {
          const Icon = ti.icon;
          return (
            <TabsTrigger
              key={ti.id}
              value={ti.id}
              className="gap-1.5 px-3 whitespace-nowrap sm:px-4"
            >
              <Icon className="h-3.5 w-3.5" aria-hidden="true" />
              {ti.label}
              {ti.count != null && (
                <span className="data-mono text-[10px] text-[var(--color-text-subtle)]">
                  {ti.count}
                </span>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {tabs.map((ti) => (
        <TabsContent key={ti.id} value={ti.id}>
          {ti.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
