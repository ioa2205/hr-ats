"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { notifyContactMessage } from "@/lib/notifications/telegram";
import { contactSchema } from "@/lib/validations/contact";

export type ContactState = { error?: string; ok?: boolean } | null;

export async function submitContactMessage(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    company: formData.get("company") || undefined,
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  const h = await headers();
  const fwd = h.get("x-forwarded-for") ?? "";
  const ip = fwd.split(",")[0]?.trim() || "unknown";

  const rl = await rateLimit({
    key: `contact:ip:${ip}`,
    limit: 3,
    windowSeconds: 3600,
  });

  if (!rl.allowed) {
    return { error: "too_many" };
  }

  const locale = (h.get("accept-language")?.split(",")[0] ?? "ru").slice(0, 8);

  const company = parsed.data.company?.trim() ? parsed.data.company.trim() : null;

  const supabase = createAdminClient();
  const { error } = await supabase.from("contact_messages").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    company,
    message: parsed.data.message,
    locale,
    source: "web",
  });

  if (error) {
    logger.error({ err: error.message, context: "contact" }, "[contact] insert failed");
    return { error: "generic" };
  }

  await notifyContactMessage({
    name: parsed.data.name,
    email: parsed.data.email,
    company,
    message: parsed.data.message,
    locale,
  });

  return { ok: true };
}
