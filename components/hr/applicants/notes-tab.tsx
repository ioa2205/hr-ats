"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import { InlineMessage, Textarea } from "@/components/ui";
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
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset notes when candidate changes
  useEffect(() => {
    setNotes(initialNotes);
    setSaved(false);
  }, [candidateId, initialNotes]);

  const saveNotes = useCallback(
    async (value: string) => {
      setSaving(true);
      setError(false);
      try {
        const res = await fetch(`/api/hr/candidates/${candidateId}/notes`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hr_notes: value }),
        });
        if (res.ok) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
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
      <Textarea
        value={notes}
        onChange={handleChange}
        placeholder={t("hr.applicants.notes_placeholder")}
        className="min-h-[240px]"
        maxCharacters={5000}
        currentLength={notes.length}
      />
      <div className="flex items-center gap-2 text-xs">
        {saving && <span className="text-[var(--color-text-muted)]">{t("common.saving")}</span>}
        {saved && !saving && (
          <span className="flex items-center gap-1 text-[var(--color-success)]">
            <Check className="h-3 w-3" />
            {t("profile.saved")}
          </span>
        )}
        {error && <InlineMessage tone="danger">{t("common.error")}</InlineMessage>}
      </div>
    </div>
  );
}
