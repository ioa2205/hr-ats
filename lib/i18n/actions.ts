"use server";

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "./types";

/**
 * Set the user's locale. Updates the cookie and, if authenticated,
 * persists the preference to profiles.locale.
 */
export async function setLocale(locale: Locale): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  // Persist to profile if authenticated
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("profiles").update({ locale }).eq("id", user.id);
  }
}
