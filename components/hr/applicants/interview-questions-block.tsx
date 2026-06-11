"use client";

import { useCallback, useMemo, useState } from "react";
import { Check, Copy, FileText, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Alert, Badge, Button, Panel, PanelHeader, PanelTitle } from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import {
  parseStoredInterviewQuestions,
  type InterviewQuestionItem,
  type QuestionFocus,
  type StoredInterviewQuestions,
} from "@/lib/gemini/interview-questions-types";

function pickQuestionsForLocale(
  blob: StoredInterviewQuestions,
  locale: Locale,
): InterviewQuestionItem[] {
  const candidates: InterviewQuestionItem[][] = [blob[locale], blob.ru];
  for (const arr of candidates) {
    if (Array.isArray(arr) && arr.length > 0) return arr;
  }
  return [];
}

interface InterviewQuestionsBlockProps {
  candidateId: string;
  candidateName: string;
  jobTitle: string;
  /** Raw value from `candidates.ai_interview_questions`. */
  initial: unknown;
  /** When false, the candidate isn't analyzed yet — render a muted hint instead. */
  ready: boolean;
}

const FOCUS_KEYS: Record<QuestionFocus, TranslationKey> = {
  strength_probe: "applicants.questions.focus.strength_probe",
  gap_probe: "applicants.questions.focus.gap_probe",
  role_fit: "applicants.questions.focus.role_fit",
  behavioral: "applicants.questions.focus.behavioral",
  signal_check: "applicants.questions.focus.signal_check",
};

function relativeTimeShort(iso: string, locale: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return locale === "ru" ? "только что" : locale === "uz" ? "hozir" : "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return locale === "ru" ? `${min} мин назад` : locale === "uz" ? `${min} daq oldin` : `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return locale === "ru" ? `${hr} ч назад` : locale === "uz" ? `${hr} soat oldin` : `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return locale === "ru" ? `${days} дн назад` : locale === "uz" ? `${days} kun oldin` : `${days}d ago`;
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
}

type Status = "idle" | "loading" | "error" | "rate_limited" | "quota_blocked";

export function InterviewQuestionsBlock({
  candidateId,
  candidateName,
  jobTitle,
  initial,
  ready,
}: InterviewQuestionsBlockProps) {
  const { t, locale } = useTranslation();
  const [questions, setQuestions] = useState<StoredInterviewQuestions | null>(() =>
    parseStoredInterviewQuestions(initial),
  );
  const [status, setStatus] = useState<Status>("idle");
  const [copyHot, setCopyHot] = useState<string | null>(null);

  const localized = useMemo<InterviewQuestionItem[]>(() => {
    if (!questions) return [];
    return pickQuestionsForLocale(questions, locale);
  }, [questions, locale]);

  const flashCopy = useCallback((id: string) => {
    setCopyHot(id);
    window.setTimeout(() => {
      setCopyHot((prev) => (prev === id ? null : prev));
    }, 1600);
  }, []);

  const handleGenerate = useCallback(
    async (regenerate: boolean) => {
      setStatus("loading");
      try {
        const url = `/api/hr/candidates/${candidateId}/interview-questions${
          regenerate ? "?regenerate=true" : ""
        }`;
        const res = await fetch(url, { method: "POST" });
        if (res.ok) {
          const body = (await res.json()) as { questions: StoredInterviewQuestions };
          setQuestions(body.questions);
          setStatus("idle");
          return;
        }
        if (res.status === 429) {
          setStatus("rate_limited");
          return;
        }
        if (res.status === 402) {
          setStatus("quota_blocked");
          return;
        }
        setStatus("error");
      } catch {
        setStatus("error");
      }
    },
    [candidateId],
  );

  const handleCopyOne = useCallback(
    async (item: InterviewQuestionItem, idx: number) => {
      await copyText(item.question);
      flashCopy(`one-${idx}`);
    },
    [flashCopy],
  );

  const handleCopyAll = useCallback(async () => {
    const all = localized.map((q, i) => `${i + 1}. ${q.question}`).join("\n");
    await copyText(all);
    flashCopy("all");
  }, [flashCopy, localized]);

  const handleCopySheet = useCallback(async () => {
    const intro = t("applicants.questions.sheet_intro", {
      candidate: candidateName,
      job: jobTitle,
    });
    const lines = localized.map(
      (q, i) =>
        `${i + 1}. [${t(FOCUS_KEYS[q.focus])}] ${q.question}\n   — ${q.rationale}`,
    );
    await copyText(`${intro}\n\n${lines.join("\n\n")}`);
    flashCopy("sheet");
  }, [candidateName, flashCopy, jobTitle, localized, t]);

  if (!ready) {
    return (
      <Panel>
        <PanelHeader>
          <PanelTitle>{t("applicants.questions.heading")}</PanelTitle>
        </PanelHeader>
        <div className="px-5 py-6 text-[12.5px] text-[var(--color-text-muted)]">
          {t("applicants.questions.candidate_not_analyzed")}
        </div>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t("applicants.questions.heading")}</PanelTitle>
        {questions && status !== "loading" && (
          <button
            type="button"
            onClick={() => handleGenerate(true)}
            title={t("applicants.questions.regenerate_warning")}
            className="flex items-center gap-1.5 rounded-[4px] border-none bg-transparent px-1.5 py-1 text-[11.5px] text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)]"
          >
            <RefreshCw className="h-3 w-3" />
            {t("applicants.questions.regenerate")}
          </button>
        )}
      </PanelHeader>

      {status === "loading" && (
        <div className="flex flex-col gap-3 px-5 py-5">
          <div className="flex items-center gap-2 text-[12.5px] text-[var(--color-text-muted)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {t("applicants.questions.generating")}
            <span className="text-[var(--color-text-subtle)]">
              · {t("applicants.questions.loading_hint")}
            </span>
          </div>
          <ul className="flex flex-col gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <li
                key={i}
                className="h-[78px] animate-pulse rounded-[5px] border border-[var(--color-line)] bg-[var(--color-surface-subtle)]/40"
              />
            ))}
          </ul>
        </div>
      )}

      {status === "rate_limited" && (
        <div className="px-5 py-4">
          <Alert tone="warning">{t("applicants.questions.rate_limited")}</Alert>
        </div>
      )}
      {status === "quota_blocked" && (
        <div className="px-5 py-4">
          <Alert tone="warning">{t("applicants.questions.quota_blocked")}</Alert>
        </div>
      )}
      {status === "error" && (
        <div className="px-5 py-4">
          <Alert tone="danger">{t("applicants.questions.error")}</Alert>
        </div>
      )}

      {!questions && status === "idle" && (
        <div className="flex flex-col items-start gap-3 px-5 py-6">
          <p className="max-w-prose text-[13px] leading-[1.55] text-[var(--color-text-muted)]">
            {t("applicants.questions.sub")}
          </p>
          <Button variant="accent" size="lg" onClick={() => handleGenerate(false)}>
            <Sparkles className="h-3.5 w-3.5" />
            {t("applicants.questions.generate_cta")}
          </Button>
        </div>
      )}

      {questions && status !== "loading" && (
        <div className="flex flex-col gap-4 px-5 py-5">
          <div
            className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-subtle)]"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {t("applicants.questions.locales_marker")}{" "}
            <span className="normal-case tracking-[0.04em] text-[var(--color-text-muted)]">
              · {t("applicants.questions.generated_ago", {
                ago: relativeTimeShort(questions.generated_at, locale),
              })}
            </span>
          </div>

          <ul className="flex flex-col gap-2.5">
            {localized.map((q, idx) => {
              const id = `one-${idx}`;
              const isCopied = copyHot === id;
              return (
                <li
                  key={idx}
                  className="group relative rounded-[5px] border border-[var(--color-line)] bg-[var(--color-surface)] px-3.5 py-3 transition-colors hover:border-[var(--color-line-strong)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Badge tone="neutral">{t(FOCUS_KEYS[q.focus])}</Badge>
                      <p className="text-[14px] font-semibold leading-[1.4] tracking-[-0.005em] text-[var(--color-text)]">
                        {q.question}
                      </p>
                      <p className="text-[12.5px] leading-[1.5] text-[var(--color-text-muted)]">
                        {q.rationale}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyOne(q, idx)}
                      aria-label={t("applicants.questions.copy_one")}
                      className="shrink-0 rounded-[4px] border-none bg-transparent px-1.5 py-1 text-[var(--color-text-subtle)] opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--color-surface-subtle)] hover:text-[var(--color-text)] focus:opacity-100"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-1 flex flex-wrap items-center gap-2 border-t border-[var(--color-line)] pt-3">
            <Button variant="primary" size="md" onClick={handleCopyAll}>
              {copyHot === "all" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copyHot === "all"
                ? t("applicants.questions.copy_all_done")
                : t("applicants.questions.copy_all")}
            </Button>
            <Button variant="secondary" size="md" onClick={handleCopySheet}>
              {copyHot === "sheet" ? <Check className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              {copyHot === "sheet"
                ? t("applicants.questions.copy_sheet_done")
                : t("applicants.questions.copy_sheet")}
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}
