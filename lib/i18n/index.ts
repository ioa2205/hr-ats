import { cookies } from "next/headers";
import type { Locale, TranslationKey } from "./types";
import { ru } from "./ru";
import { uz } from "./uz";
import { en } from "./en";
import { createClient } from "@/lib/supabase/server";

const translations: Record<Locale, Record<TranslationKey, string>> = {
  ru,
  uz,
  en,
};

const LOCALE_COOKIE = "locale";
const DEFAULT_LOCALE: Locale = "ru";

function isLocale(value: string): value is Locale {
  return value === "ru" || value === "uz" || value === "en";
}

/**
 * Resolve the current locale.
 * Priority: profiles.locale (authenticated) > cookie > default ('ru').
 */
export async function getLocale(): Promise<Locale> {
  // Try profile locale for authenticated users
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("locale")
      .eq("id", user.id)
      .single();

    if (profile?.locale && isLocale(profile.locale)) {
      return profile.locale;
    }
  }

  // Fall back to cookie
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  if (value && isLocale(value)) return value;

  return DEFAULT_LOCALE;
}

/**
 * Resolve locale for the candidate apply page.
 * Priority: cookie > company default_locale > 'ru'.
 * Supports all three locales — candidates can view a posting in RU, UZ, or EN.
 */
export async function getApplyLocale(companyDefaultLocale?: string): Promise<Locale> {
  const cookieStore = await cookies();
  const value = cookieStore.get(LOCALE_COOKIE)?.value;
  if (value && isLocale(value)) return value;

  if (companyDefaultLocale && isLocale(companyDefaultLocale)) {
    return companyDefaultLocale;
  }

  return DEFAULT_LOCALE;
}

/**
 * Return the full resolved message dictionary for a locale.
 * Used by route-group layouts to hydrate the client-side TranslationsProvider.
 */
export function getMessages(locale: Locale): Record<TranslationKey, string> {
  return translations[locale];
}

export function t(key: TranslationKey, locale: Locale, vars?: Record<string, string>): string {
  let value = translations[locale][key] ?? translations[DEFAULT_LOCALE][key] ?? key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
  }

  return value;
}
