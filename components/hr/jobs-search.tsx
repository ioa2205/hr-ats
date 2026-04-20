"use client";

import { useState, useMemo, type ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

interface JobsSearchProps {
  children: (filteredIds: Set<string> | null) => ReactNode;
  jobs: Array<{ id: string; title: string }>;
}

export function JobsSearch({ children, jobs }: JobsSearchProps) {
  const [query, setQuery] = useState("");
  const { t } = useTranslation();

  const filteredIds = useMemo(() => {
    if (!query.trim()) return null;
    const lower = query.toLowerCase();
    const ids = new Set<string>();
    for (const job of jobs) {
      if (job.title.toLowerCase().includes(lower)) {
        ids.add(job.id);
      }
    }
    return ids;
  }, [query, jobs]);

  return (
    <>
      <Input
        placeholder={t("hr.jobs.search")}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        startAdornment={<Search className="h-4 w-4" />}
        className="max-w-sm"
      />
      {children(filteredIds)}
    </>
  );
}
