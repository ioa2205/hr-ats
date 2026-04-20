"use client";

import { useCallback, useEffect, useState } from "react";
import { Pin, Send, Trash2 } from "lucide-react";
import { Button, Textarea, useToast } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

interface Note {
  id: number;
  body: string;
  pinned: boolean;
  authorUserId: string | null;
  author: string | null;
  createdAt: string;
  updatedAt: string;
}

export function NotesPanel({ companyId }: { companyId: string }) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [notes, setNotes] = useState<Note[]>([]);
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/operator/companies/${companyId}/notes`, { cache: "no-store" });
      if (res.ok) {
        const j = (await res.json()) as { notes: Note[] };
        setNotes(j.notes);
      }
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit() {
    if (!body.trim() || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/operator/companies/${companyId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, pinned }),
      });
      if (!res.ok) {
        toast({ variant: "error", title: t("operator.notes.save_failed") });
        return;
      }
      setBody("");
      setPinned(false);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(n: Note) {
    const res = await fetch(`/api/operator/companies/${companyId}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id, pinned: !n.pinned }),
    });
    if (res.ok) await load();
  }

  async function del(n: Note) {
    const res = await fetch(`/api/operator/companies/${companyId}/notes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: n.id }),
    });
    if (res.ok) await load();
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-rule-2)] bg-[var(--color-paper)]">
      <header className="border-b border-[var(--color-rule-2)] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-ink-4)]">
        {t("operator.notes.title")}
      </header>

      <div className="flex flex-col gap-2 border-b border-[var(--color-rule)] p-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("operator.notes.placeholder")}
          rows={3}
        />
        <p className="nums text-right font-[var(--font-tez-mono)] text-[10px] text-[var(--color-ink-5)]">
          {body.length.toLocaleString()} / 8,000
        </p>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-[11px] text-[var(--color-ink-3)]">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="h-3 w-3"
            />
            {t("operator.notes.pin_checkbox")}
          </label>
          <Button size="sm" onClick={submit} loading={busy} disabled={!body.trim()}>
            <Send className="h-3.5 w-3.5" />
            {t("operator.notes.submit")}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="p-6 text-center text-[12px] text-[var(--color-ink-4)]">
          {t("operator.notes.loading")}
        </p>
      ) : notes.length === 0 ? (
        <p className="p-6 text-center text-[12px] text-[var(--color-ink-4)]">
          {t("operator.notes.empty")}
        </p>
      ) : (
        <ul className="divide-y divide-[var(--color-rule)]">
          {notes.map((n) => (
            <li
              key={n.id}
              className={`flex flex-col gap-1 p-4 ${n.pinned ? "border-l-2 border-[var(--color-persimmon)]" : ""}`}
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.06em] text-[var(--color-ink-5)]">
                <span>
                  {n.author ?? t("operator.notes.default_author")} ·{" "}
                  {new Date(n.createdAt).toLocaleString()}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => void togglePin(n)}
                    className="rounded-[var(--radius-sm)] p-1 hover:bg-[var(--color-bone-2)]"
                    aria-label={n.pinned ? t("operator.notes.unpin") : t("operator.notes.pin")}
                    title={n.pinned ? t("operator.notes.unpin") : t("operator.notes.pin")}
                  >
                    <Pin
                      className={`h-3 w-3 ${n.pinned ? "text-[var(--color-persimmon)]" : ""}`}
                    />
                  </button>
                  <button
                    onClick={() => void del(n)}
                    className="rounded-[var(--radius-sm)] p-1 hover:bg-[var(--color-bone-2)]"
                    aria-label={t("operator.notes.delete")}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
              <p className="whitespace-pre-wrap text-[13px] text-[var(--color-ink)]">{n.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
