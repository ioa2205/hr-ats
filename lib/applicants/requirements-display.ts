import type { HardRequirement, RequirementResponses, RequirementSnapshot } from "@/types";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import { isRequirementMet } from "@/lib/validations/requirements";

export interface RequirementDisplayRow {
  id: string;
  label: string;
  met: boolean;
  /** Pretty-printed required value, e.g. "5+ years" or "Yes" or "—". */
  requiredText: string;
  /** Pretty-printed candidate answer, e.g. "1 year" or "No" or "—". */
  answerText: string;
}

type Translator = (key: TranslationKey, vars?: Record<string, string>) => string;

function pickLabel(req: HardRequirement, locale: Locale): string {
  if (locale === "uz") return req.label_uz || req.label_ru;
  if (locale === "en") return req.label_en || req.label_ru;
  return req.label_ru;
}

function formatRequired(req: HardRequirement, t: Translator): string {
  if (req.type === "boolean") return t("applicants.requirements.boolean_yes");
  if (req.type === "number") {
    if (req.min_value === null) return t("applicants.requirements.no_answer");
    return t("applicants.requirements.years_unit", { value: `${req.min_value}+` });
  }
  return t("applicants.requirements.no_answer");
}

function formatAnswer(req: HardRequirement, raw: string, t: Translator): string {
  if (!raw) return t("applicants.requirements.no_answer");
  if (req.type === "boolean") {
    if (raw === "true") return t("applicants.requirements.boolean_yes");
    if (raw === "false") return t("applicants.requirements.boolean_no");
    return t("applicants.requirements.no_answer");
  }
  if (req.type === "number") {
    const num = Number(raw);
    if (Number.isNaN(num)) return raw;
    return t("applicants.requirements.years_unit", { value: String(num) });
  }
  return raw;
}

/**
 * Build the full requirement Q&A table shown in the HR detail view (every
 * requirement, met or not). Returns rows in the snapshot's natural order.
 */
export function buildRequirementsTable(
  snapshot: RequirementSnapshot | null | undefined,
  responses: RequirementResponses | null | undefined,
  locale: Locale,
  t: Translator,
): RequirementDisplayRow[] {
  if (!snapshot || snapshot.length === 0) return [];

  const ordered = [...snapshot].sort((a, b) => a.order - b.order);
  return ordered.map((req) => {
    const raw = responses?.[req.id] ?? "";
    return {
      id: req.id,
      label: pickLabel(req, locale),
      met: isRequirementMet(req, raw),
      requiredText: formatRequired(req, t),
      answerText: formatAnswer(req, raw, t),
    };
  });
}

/**
 * Compact "Lacks: A, B" string for the candidate-list row of an unscored
 * candidate. Returns null when nothing is unmet (caller decides what to show).
 */
export function buildMismatchSummary(
  snapshot: RequirementSnapshot | null | undefined,
  responses: RequirementResponses | null | undefined,
  locale: Locale,
  t: Translator,
): string | null {
  const rows = buildRequirementsTable(snapshot, responses, locale, t);
  const unmet = rows.filter((r) => !r.met);
  if (unmet.length === 0) return null;
  return t("applicants.requirements.unmet_summary", {
    labels: unmet.map((r) => r.label).join(", "),
  });
}
