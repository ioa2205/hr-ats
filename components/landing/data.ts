import type { TranslationKey } from "@/lib/i18n/types";

export type CandidateTone = "top" | "good" | "ok" | "low";

export interface Candidate {
  initials: string;
  name: string;
  score: number;
  tone: CandidateTone;
  tags: string[];
  langs: string[];
  roleKey: TranslationKey;
  expKey: TranslationKey;
  summaryKey: TranslationKey;
  salaryKey: TranslationKey | null;
}

export const CANDIDATES: Candidate[] = [
  {
    initials: "ДР",
    name: "Диёра Рахимова",
    score: 94,
    tone: "top",
    tags: ["Figma", "B2B SaaS", "RU/EN"],
    langs: ["RU", "UZ", "EN"],
    roleKey: "landing.cand.role1",
    expKey: "landing.cand.exp1",
    summaryKey: "landing.cand.summary1",
    salaryKey: "landing.cand.salary1",
  },
  {
    initials: "АК",
    name: "Азиз Каримов",
    score: 87,
    tone: "good",
    tags: ["Figma", "Design System", "Webflow"],
    langs: ["RU", "UZ"],
    roleKey: "landing.cand.role2",
    expKey: "landing.cand.exp2",
    summaryKey: "landing.cand.summary2",
    salaryKey: "landing.cand.salary2",
  },
  {
    initials: "МЮ",
    name: "Мадина Юсупова",
    score: 82,
    tone: "good",
    tags: ["Figma", "User research", "EN"],
    langs: ["RU", "EN"],
    roleKey: "landing.cand.role3",
    expKey: "landing.cand.exp3",
    summaryKey: "landing.cand.summary3",
    salaryKey: "landing.cand.salary3",
  },
  {
    initials: "ТС",
    name: "Тимур Собиров",
    score: 76,
    tone: "ok",
    tags: ["Figma", "Mobile"],
    langs: ["RU", "UZ"],
    roleKey: "landing.cand.role4",
    expKey: "landing.cand.exp4",
    summaryKey: "landing.cand.summary4",
    salaryKey: "landing.cand.salary4",
  },
  {
    initials: "НИ",
    name: "Нигора Исмаилова",
    score: 68,
    tone: "ok",
    tags: ["Figma", "Junior"],
    langs: ["RU", "UZ"],
    roleKey: "landing.cand.role5",
    expKey: "landing.cand.exp5",
    summaryKey: "landing.cand.summary5",
    salaryKey: "landing.cand.salary5",
  },
  {
    initials: "РЮ",
    name: "Рустам Юлдашев",
    score: 41,
    tone: "low",
    tags: ["Photoshop", "Print"],
    langs: ["RU", "UZ"],
    roleKey: "landing.cand.role6",
    expKey: "landing.cand.exp6",
    summaryKey: "landing.cand.summary6",
    salaryKey: null,
  },
];

export interface AiLang {
  code: string;
  pct: number;
}

export const AI_LANGS: AiLang[] = [
  { code: "RU", pct: 100 },
  { code: "UZ", pct: 100 },
  { code: "EN", pct: 88 },
];

export const AI_STRENGTH_KEYS: TranslationKey[] = [
  "landing.ai.str.1",
  "landing.ai.str.2",
  "landing.ai.str.3",
  "landing.ai.str.4",
];

export const AI_GAP_KEYS: TranslationKey[] = ["landing.ai.gap.1", "landing.ai.gap.2"];

export const AI_SCORE = 94;
