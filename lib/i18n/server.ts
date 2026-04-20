import "server-only";
import { getLocale } from "./index";
import { t as translate } from "./index";
import type { Locale, TranslationKey } from "./types";

export interface ServerT {
  locale: Locale;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
}

export async function getT(): Promise<ServerT> {
  const locale = await getLocale();
  return {
    locale,
    t: (key, vars) => translate(key, locale, vars),
  };
}
