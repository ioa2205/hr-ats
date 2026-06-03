/**
 * Telegram message triage: the cheap deterministic pre-filter (regex/heuristics,
 * no AI) that caps how many messages reach the paid Gemini step, plus the AI
 * classify+extract prompt and its fail-closed Zod parse.
 *
 * Two stages, in order:
 *  1. {@link prefilter} — keep only messages that (a) expose a contact handle
 *     (a Telegram candidate without contact is unpromotable), (b) carry a
 *     role/skill signal, and (c) are not obvious promo/ads. This is a coarse,
 *     fail-OPEN gate (borderline → keep, the AI decides); the ONE hard drop is
 *     "no contact handle".
 *  2. {@link buildTelegramClassifyPrompt} — the Flash prompt that classifies
 *     candidate_cv | vacancy | ad | other and extracts provenance-tagged fields
 *     ONLY for a self-presenting job seeker. The connector rejects vacancy/ad/
 *     other and low-confidence results.
 */
import { normalizePhone } from "../../identity";
import { detectIntent } from "./recency";

// ===================================================================
// Contact-handle extraction (deterministic — drives dedup + promotability).
// ===================================================================

export interface ExtractedContact {
  /** stable grouping key for repost-collapse + dedup (e.g. "tg:@ivan"). */
  key: string;
  /** "@username" (lowercased) or null. */
  username: string | null;
  /** normalized phone digits or null. */
  phone: string | null;
  /** email (lowercased) or null. */
  email: string | null;
  /** public profile link derived from the username, or null. */
  profile_url: string | null;
}

// @username: 5–32 chars, must start with a letter; not preceded by a word char
// (so an email local-part like "ivan@" does NOT match the domain as a handle).
const USERNAME_RE = /(?<![\w@/])@([a-zA-Z][a-zA-Z0-9_]{4,31})\b/g;
const TME_RE = /(?:https?:\/\/)?t\.me\/([a-zA-Z][a-zA-Z0-9_]{4,31})\b/gi;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
// Phone-like run: optional +, then digits/spaces/dashes/parens, ≥ 9 digits.
const PHONE_RE = /\+?\d[\d\s\-()]{7,}\d/g;

/** t.me bot/channel suffixes that are never a personal contact handle. */
const NON_CONTACT_HANDLES = new Set(["joinchat", "addstickers", "share", "proxy"]);

/**
 * Pull the strongest contact handle from a message, in priority order
 * username → phone → email. Returns null when none is present (the pre-filter
 * then drops the message). The username is preferred because it is the most
 * stable cross-channel identity for repost-collapse.
 */
export function extractContact(text: string): ExtractedContact | null {
  let username: string | null = null;
  for (const m of text.matchAll(USERNAME_RE)) {
    const handle = m[1].toLowerCase();
    if (!NON_CONTACT_HANDLES.has(handle)) {
      username = handle;
      break;
    }
  }
  if (!username) {
    for (const m of text.matchAll(TME_RE)) {
      const handle = m[1].toLowerCase();
      if (!NON_CONTACT_HANDLES.has(handle)) {
        username = handle;
        break;
      }
    }
  }

  const emailMatch = text.match(EMAIL_RE);
  const email = emailMatch ? emailMatch[0].toLowerCase() : null;

  let phone: string | null = null;
  for (const m of text.matchAll(PHONE_RE)) {
    const digits = normalizePhone(m[0]);
    if (digits.length >= 9 && digits.length <= 15) {
      phone = digits;
      break;
    }
  }

  if (username) {
    return {
      key: `tg:@${username}`,
      username: `@${username}`,
      phone,
      email,
      profile_url: `https://t.me/${username}`,
    };
  }
  if (phone) {
    return { key: `tel:${phone}`, username: null, phone, email, profile_url: null };
  }
  if (email) {
    return { key: `eml:${email}`, username: null, phone: null, email, profile_url: null };
  }
  return null;
}

// ===================================================================
// Role/skill + ad heuristics.
// ===================================================================

/** Generic role/skill/"I'm a job seeker" markers across ru/uz/en. */
const ROLE_SIGNAL_PHRASES: readonly string[] = [
  "резюме",
  "resume",
  "cv",
  "опыт работы",
  "опыт",
  "стаж",
  "должность",
  "специалист",
  "портфолио",
  "portfolio",
  "навыки",
  "skills",
  "experience",
  "tajriba",
  "mutaxassis",
  "rezyume",
  "malaka",
];

/** Obvious promo/ad markers — dropped UNLESS the post also signals job-seeking. */
const AD_PHRASES: readonly string[] = [
  "реклама",
  "подпишись",
  "подписывайся",
  "розыгрыш",
  "купить",
  "продаю",
  "продам",
  "скидка",
  "акция",
  "курс",
  "обучение",
  "запишись",
  "бесплатный вебинар",
  "инвестиции",
  "заработок",
  "криптовалюта",
  "реклам",
  "kurs",
  "chegirma",
  "aksiya",
  "obuna bo'ling",
];

function containsAny(hay: string, phrases: readonly string[]): boolean {
  return phrases.some((p) => hay.includes(p));
}

export type PrefilterReason = "no_contact" | "no_role_signal" | "ad" | "empty";

export interface PrefilterResult {
  keep: boolean;
  reason: PrefilterReason | null;
  contact: ExtractedContact | null;
}

/**
 * Coarse, cheap gate before the paid AI step. Hard drop ONLY when there is no
 * contact handle (unpromotable); otherwise drop empties, obvious ads with no
 * job-seeking signal, and posts with no role/skill signal at all. Fail-open:
 * anything plausibly a CV is passed to the AI, which is the authoritative
 * classifier (and the only thing that rejects recruiter vacancies).
 */
export function prefilter(text: string): PrefilterResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { keep: false, reason: "empty", contact: null };

  const contact = extractContact(text);
  if (!contact) return { keep: false, reason: "no_contact", contact: null };

  const hay = trimmed.toLowerCase().replace(/\s+/g, " ");
  const intent = detectIntent(text);
  const hasRoleSignal = intent.active || containsAny(hay, ROLE_SIGNAL_PHRASES);
  const looksLikeAd = containsAny(hay, AD_PHRASES);

  // An ad with no job-seeking signal is dropped; an ad that ALSO says "ищу
  // работу" is kept (the AI sorts it out).
  if (looksLikeAd && !intent.active && !hasRoleSignal) {
    return { keep: false, reason: "ad", contact };
  }
  if (!hasRoleSignal) return { keep: false, reason: "no_role_signal", contact };

  return { keep: true, reason: null, contact };
}

// ===================================================================
// AI classify + extract prompt (Gemini Flash, JSON mode).
// ===================================================================

export const TELEGRAM_CLASSIFY_SYSTEM = `You triage ONE Telegram message from a public job/CV channel. Decide what it is, and ONLY if it is a person presenting THEMSELVES as a job seeker, extract their details.

You operate under three non-negotiable rules:
R1 — Source-only. Use ONLY the message text. If a fact is not stated, it is unknown. Never infer, assume, or imagine.
R2 — Cite everything. Every extracted field MUST quote the exact source span in "evidence". No quotable evidence ⇒ do not output the field.
R3 — Fail closed. If you are unsure what the message is, classify "other" with low confidence.

Classify into exactly one:
- "candidate_cv": a real person offering THEMSELVES for work (their own CV / "ищу работу" / "open to work"). The author IS the job seeker.
- "vacancy": someone offering a JOB to others — a recruiter/company hiring (e.g. "требуется", "ищем", "вакансия", "we are hiring", "в команду нужен"). This is NOT a candidate. CRITICAL: never classify a job offer as candidate_cv.
- "ad": promotion, course, channel growth, sale, spam.
- "other": announcement, question, chat, anything else.

Set actively_looking=true ONLY if the message explicitly says the author is seeking work now.

For candidate_cv ONLY, fill fields[] with provenance-tagged facts using these labels where present: "name", "headline" (their role/title), "location", "skill" (one per skill), "experience", "language", "education", "salary_expectation". value = the normalized fact; evidence = the verbatim quote. For any other classification, return fields: []. Output strictly in the schema. No prose.`;

/** Render the user prompt: the single message wrapped as the only source. */
export function buildTelegramClassifyPrompt(text: string): string {
  return `<message>\n${text}\n</message>`;
}
