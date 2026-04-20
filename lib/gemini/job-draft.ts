import { z } from "zod/v4";

/**
 * JSON Schema fed to Gemini's `responseSchema` — guarantees decoder output.
 * Requirements use nested label_{ru,uz,en} so the same endpoint produces a
 * save-ready payload for the trilingual job form.
 */
export const jobDraftJsonSchema = {
  type: "object",
  properties: {
    title_ru: { type: "string", maxLength: 200 },
    title_uz: { type: "string", maxLength: 200 },
    title_en: { type: "string", maxLength: 200 },
    description_ru: { type: "string", maxLength: 8000 },
    description_uz: { type: "string", maxLength: 8000 },
    description_en: { type: "string", maxLength: 8000 },
    required_skills: {
      type: "array",
      items: { type: "string", maxLength: 60 },
      minItems: 0,
      maxItems: 20,
    },
    hard_requirements: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label_ru: { type: "string", maxLength: 120 },
          label_uz: { type: "string", maxLength: 120 },
          label_en: { type: "string", maxLength: 120 },
          type: { type: "string", enum: ["boolean", "number"] },
          min_value: { type: "integer", minimum: 0, maximum: 50 },
        },
        required: ["label_ru", "label_uz", "label_en", "type"],
      },
      minItems: 0,
      maxItems: 8,
    },
  },
  required: [
    "title_ru",
    "title_uz",
    "title_en",
    "description_ru",
    "description_uz",
    "description_en",
    "required_skills",
    "hard_requirements",
  ],
} as const;

export const JobDraftZod = z.object({
  title_ru: z.string().min(3).max(200),
  title_uz: z.string().min(3).max(200),
  title_en: z.string().min(3).max(200),
  description_ru: z.string().min(20).max(8000),
  description_uz: z.string().min(20).max(8000),
  description_en: z.string().min(20).max(8000),
  required_skills: z.array(z.string().min(1).max(60)).max(20),
  hard_requirements: z
    .array(
      z.object({
        label_ru: z.string().min(1).max(120),
        label_uz: z.string().min(1).max(120),
        label_en: z.string().min(1).max(120),
        type: z.enum(["boolean", "number"]),
        min_value: z.number().int().min(0).max(50).nullable().optional(),
      }),
    )
    .max(8),
});

export type JobDraft = z.infer<typeof JobDraftZod>;

/**
 * System instruction for drafting a complete trilingual job posting from a
 * short HR brief. Gemini produces title + description + skills + requirements
 * in Russian, Uzbek, and English — saveable as-is.
 */
export function buildJobDraftPrompt(): string {
  return `You draft professional job postings for the Uzbek labor market.
You must produce output in Russian, Uzbek (Latin script), and English simultaneously.
Return ONLY valid JSON matching the provided schema. No markdown, no preamble.

=== STYLE ===
- Title: 4-10 words. Role + seniority. No company name, no emoji.
- Description: Structured markdown using ## section headings and bullet lists
  (-). Use EXACTLY these four sections, in this order, localized per language:
    ## About the role          (ru: "## О роли"        uz: "## Rol haqida")
    1-2 short paragraphs on what the role does and the team or product.
    ## What you'll do          (ru: "## Что вы будете делать"  uz: "## Nimalar qilasiz")
    4-7 bullets, concrete responsibilities. Each bullet starts with an action verb.
    ## What we're looking for  (ru: "## Кого мы ищем"   uz: "## Kimni qidiramiz")
    4-7 bullets, must-haves.
    ## Nice to have            (ru: "## Будет плюсом"   uz: "## Qo'shimcha afzalliklar")
    2-4 bullets, nice-to-haves. Omit this section entirely if none are sensible.
  Keep bullets short (under 18 words). No emoji. No bold in bullets.
- required_skills: 4-10 items. Brand-name technologies (Python, React, SQL)
  or narrowly-defined hard skills. Keep these in English/original spelling —
  they are shared across all three languages.
- hard_requirements: 2-5 items. These are binary or numeric gates candidates
  must self-declare on the apply form. Examples:
    { label_ru: "Опыт работы от 3 лет", label_uz: "3+ yil tajriba",
      label_en: "3+ years experience", type: "number", min_value: 3 }
    { label_ru: "Разрешение на работу в Узбекистане",
      label_uz: "O'zbekistonda ishlash uchun ruxsat",
      label_en: "Authorized to work in Uzbekistan", type: "boolean" }
  Prefer number-gated experience and boolean gates for credentials.

=== LANGUAGE RULES ===
- Russian: Standard business Russian as used in Uzbek corporate contexts.
- Uzbek: Latin script only. Pragmatic, direct, modern. Avoid archaisms.
- English: Clear US-style business English. No British spellings.
- All three versions must cover the same ground — not literal word-for-word,
  but equivalent meaning and scope.

=== HARD RULES ===
- No salary figures in the description unless the brief explicitly states them.
- No discriminatory filters (age, gender, nationality, marital status).
- No placeholder text ("TBD", "[fill this in]").
- If the brief is too thin to reason about, make one sensible inference and
  proceed — do not ask clarifying questions, do not refuse.`;
}

/**
 * Prompt for filling in missing locales on save. Receives the locales that
 * are already populated and asks Gemini to produce the remaining ones.
 * Same JSON schema, same response shape — the server trusts everything back.
 */
export function buildJobTranslatePrompt(opts: {
  haveLocales: ("ru" | "uz" | "en")[];
  skills: string[];
}): string {
  const have = opts.haveLocales.join(", ");
  return `You are filling in missing locales for an existing job posting.
The user has already written the posting in: ${have}.
Translate into the missing locales, preserving tone, structure, and all facts.
Required skills stay as-is: ${opts.skills.join(", ") || "(none)"}.
Return ONLY valid JSON matching the provided schema. No markdown, no preamble.

=== RULES ===
- Do not add or remove information.
- Do not change numbers, brand names, or proper nouns.
- Uzbek: Latin script only.
- Keep the exact markdown structure — same ## headings (translated), same
  bullet lists, same paragraph breaks. Translate heading labels per language.
- If a field is already provided, echo it back verbatim (do not "improve" it).`;
}
