"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/provider";

interface NotesTabProps {
  candidateId: string;
  initialNotes: string;
}

export function NotesTab({ candidateId, initialNotes }: NotesTabProps) {
  const { t } = useTranslation();
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset notes when candidate changes
  useEffect(() => {
    setNotes(initialNotes);
    setSaved(false);
  }, [candidateId, initialNotes]);

  const saveNotes = useCallback(
    async (value: string) => {
      setSaving(true);
      try {
        const res = await fetch(`/api/hr/candidates/${candidateId}/notes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hr_notes: value }),
        });
        if (res.ok) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      } finally {
        setSaving(false);
      }
    },
    [candidateId],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNotes(value);
    setSaved(false);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => saveNotes(value), 1000);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="space-y-2">
      <textarea
        value={notes}
        onChange={handleChange}
        placeholder={t("hr.applicants.notes_placeholder")}
        className="border-outline-variant bg-surface text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary min-h-[200px] w-full resize-y rounded-[var(--radius-md)] border px-3 py-2 text-sm focus:outline-none"
      />
      <div className="flex items-center gap-2 text-xs">
        {saving && <span className="text-on-surface-variant">{t("common.saving")}</span>}
        {saved && !saving && (
          <span className="text-success flex items-center gap-1">
            <Check className="h-3 w-3" />
            {t("profile.saved")}
          </span>
        )}
      </div>
    </div>
  );
}
