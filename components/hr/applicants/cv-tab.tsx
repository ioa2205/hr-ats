"use client";

import { useState, useEffect } from "react";
import { ExternalLink, Download, FileText } from "lucide-react";
import { Button, Spinner, EmptyState } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

interface CvTabProps {
  candidateId: string;
}

export function CvTab({ candidateId }: CvTabProps) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchUrl() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/hr/candidates/${candidateId}/cv-url`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "load_failed");
        }
        const data = await res.json();
        if (!cancelled) setUrl(data.url);
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "load_failed";
          setError(msg);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchUrl();
    return () => {
      cancelled = true;
    };
  }, [candidateId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<FileText />}
        title={t("hr.applicants.cv_unavailable")}
        description={error === "no_cv" ? t("applicants.cv.no_cv") : t("applicants.cv.load_failed")}
      />
    );
  }

  if (!url) return null;

  return (
    <div className="space-y-3">
      <iframe
        src={url}
        className="h-[min(720px,68dvh)] w-full rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)]"
        title={t("hr.applicants.cv_title")}
      />
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-3.5 w-3.5" />
            {t("applicants.cv.open_tab")}
          </a>
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <a href={url} download>
            <Download className="h-3.5 w-3.5" />
            {t("applicants.cv.download")}
          </a>
        </Button>
      </div>
    </div>
  );
}
