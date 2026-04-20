"use server";

import { revalidatePath } from "next/cache";
import { requireOperator } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

export type InboxResult = { ok: true } | { ok: false; error: string };

export async function markInboxRead(id: string): Promise<InboxResult> {
  await requireOperator();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    logger.warn({ err: error.message, id }, "[inbox] mark read failed");
    return { ok: false, error: "generic" };
  }

  revalidatePath("/operator/inbox");
  return { ok: true };
}

export async function markInboxUnread(id: string): Promise<InboxResult> {
  await requireOperator();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ read_at: null })
    .eq("id", id);

  if (error) {
    logger.warn({ err: error.message, id }, "[inbox] mark unread failed");
    return { ok: false, error: "generic" };
  }

  revalidatePath("/operator/inbox");
  return { ok: true };
}

export async function markAllInboxRead(): Promise<InboxResult> {
  await requireOperator();
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("contact_messages")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);

  if (error) {
    logger.warn({ err: error.message }, "[inbox] mark all read failed");
    return { ok: false, error: "generic" };
  }

  revalidatePath("/operator/inbox");
  return { ok: true };
}
