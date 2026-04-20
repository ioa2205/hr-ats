import { callGeminiFlashJson } from "./call-flash";
import {
  buildJobTranslatePrompt,
  jobDraftJsonSchema,
  JobDraftZod,
  type JobDraft,
} from "./job-draft";
import { logger } from "../logger";

interface PostingFields {
  title_ru?: string | null;
  title_uz?: string | null;
  title_en?: string | null;
  description_ru?: string | null;
  description_uz?: string | null;
  description_en?: string | null;
  required_skills: string[];
  hard_requirements: Array<{
    label_ru: string;
    label_uz: string;
    label_en?: string;
    type: "boolean" | "number";
    min_value: number | null;
  }>;
}

/**
 * Fills in any missing locales on a posting by asking Gemini Flash to
 * translate from whichever locales are already populated. Returns the
 * same shape with all six title/description fields and all requirement
 * labels guaranteed non-empty.
 *
 * If *every* locale is already populated, returns the input untouched
 * (no Gemini call).
 */
export async function fillMissingLocales(input: PostingFields): Promise<PostingFields> {
  const haveTitle = {
    ru: nonEmpty(input.title_ru),
    uz: nonEmpty(input.title_uz),
    en: nonEmpty(input.title_en),
  };
  const haveDesc = {
    ru: nonEmpty(input.description_ru),
    uz: nonEmpty(input.description_uz),
    en: nonEmpty(input.description_en),
  };

  const allTitle = haveTitle.ru && haveTitle.uz && haveTitle.en;
  const allDesc = haveDesc.ru && haveDesc.uz && haveDesc.en;
  const reqsComplete = input.hard_requirements.every(
    (r) => nonEmpty(r.label_ru) && nonEmpty(r.label_uz) && nonEmpty(r.label_en),
  );
  if (allTitle && allDesc && reqsComplete) return input;

  const present: ("ru" | "uz" | "en")[] = [];
  if (haveTitle.ru && haveDesc.ru) present.push("ru");
  if (haveTitle.uz && haveDesc.uz) present.push("uz");
  if (haveTitle.en && haveDesc.en) present.push("en");

  if (present.length === 0) {
    // Nothing to translate from — can't help.
    throw new Error("no_source_locale");
  }

  const userPrompt = JSON.stringify({
    title_ru: input.title_ru ?? "",
    title_uz: input.title_uz ?? "",
    title_en: input.title_en ?? "",
    description_ru: input.description_ru ?? "",
    description_uz: input.description_uz ?? "",
    description_en: input.description_en ?? "",
    required_skills: input.required_skills,
    hard_requirements: input.hard_requirements.map((r) => ({
      label_ru: r.label_ru ?? "",
      label_uz: r.label_uz ?? "",
      label_en: r.label_en ?? "",
      type: r.type,
      min_value: r.min_value,
    })),
  });

  const { text } = await callGeminiFlashJson({
    systemInstruction: buildJobTranslatePrompt({
      haveLocales: present,
      skills: input.required_skills,
    }),
    userPrompt,
    responseSchema: jobDraftJsonSchema,
    temperature: 0.2,
    maxOutputTokens: 4096,
  });

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch (err) {
    logger.error(
      { context: "translate-posting", err, text: text.slice(0, 200) },
      "Gemini returned non-JSON",
    );
    throw new Error("ai_parse_failed");
  }

  const translated = JobDraftZod.safeParse(parsedJson);
  if (!translated.success) {
    logger.error(
      { context: "translate-posting", issues: translated.error.issues.slice(0, 3) },
      "Translated posting failed Zod validation",
    );
    throw new Error("ai_schema_mismatch");
  }

  return mergePreserveOriginals(input, translated.data);
}

function nonEmpty(v: string | null | undefined): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

/**
 * Keeps the HR-written text as authoritative; only uses Gemini output for
 * fields the user left blank. Prevents "improvement" drift on prose the user
 * already wrote.
 */
function mergePreserveOriginals(
  original: PostingFields,
  translated: JobDraft,
): PostingFields {
  const pick = (orig: string | null | undefined, ai: string) =>
    nonEmpty(orig) ? orig : ai;

  const mergedReqs = original.hard_requirements.map((r, i) => {
    const aiReq = translated.hard_requirements[i];
    if (!aiReq) return r;
    return {
      ...r,
      label_ru: nonEmpty(r.label_ru) ? r.label_ru : aiReq.label_ru,
      label_uz: nonEmpty(r.label_uz) ? r.label_uz : aiReq.label_uz,
      label_en: nonEmpty(r.label_en) ? r.label_en : aiReq.label_en,
    };
  });

  return {
    title_ru: pick(original.title_ru, translated.title_ru),
    title_uz: pick(original.title_uz, translated.title_uz),
    title_en: pick(original.title_en, translated.title_en),
    description_ru: pick(original.description_ru, translated.description_ru),
    description_uz: pick(original.description_uz, translated.description_uz),
    description_en: pick(original.description_en, translated.description_en),
    required_skills: original.required_skills,
    hard_requirements: mergedReqs,
  };
}
