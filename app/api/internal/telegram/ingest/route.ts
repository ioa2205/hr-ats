import { NextResponse, after, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  runTelegramIngest,
  type IntakeChannel,
  type LearnedChat,
  type IngestPostRow,
} from "@/lib/sourcing/connectors/telegram/ingest";
import { classifyWithGemini } from "@/lib/sourcing/connectors/telegram";
import type { Json } from "@/types/supabase";

// Telegram bot-intake worker. Invoked by the telegram-bot-ingest pg_cron job
// (service-role bearer, verified below). Polls the bot's getUpdates, persists
// new channel posts for registered OWNED channels into telegram_posts, and
// classifies each once. Long-running on Railway; runs in after() for a fast 202.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // No bot token ⇒ owned-channel intake is off; nothing to poll.
  const token = env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: true, skipped: "no_bot_token" }, { status: 200 });
  }

  const admin = createAdminClient();

  after(async () => {
    try {
      const summary = await runTelegramIngest({
        maxAgeDays: env.TELEGRAM_INTAKE_RETENTION_DAYS,
        classify: classifyWithGemini,
        fetchUpdates: async (offset) => {
          const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              offset,
              limit: 100,
              timeout: 0,
              allowed_updates: ["channel_post", "edited_channel_post"],
            }),
          });
          if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw new Error(`getUpdates ${res.status}: ${body.slice(0, 200)}`);
          }
          return res.json();
        },
        loadChannels: async (): Promise<IntakeChannel[]> => {
          const { data } = await admin
            .from("telegram_intake_channels")
            .select("company_id, handle, chat_id")
            .eq("active", true);
          return (data ?? []).map((row) => ({
            companyId: row.company_id,
            handle: row.handle,
            chatId: row.chat_id,
          }));
        },
        loadOffset: async () => {
          const { data } = await admin
            .from("telegram_ingest_state")
            .select("last_update_id")
            .eq("singleton", true)
            .single();
          return data?.last_update_id ?? 0;
        },
        saveOffset: async (updateId) => {
          await admin
            .from("telegram_ingest_state")
            .update({ last_update_id: updateId, updated_at: new Date().toISOString() })
            .eq("singleton", true);
        },
        upsertPosts: async (rows: IngestPostRow[]) => {
          const insert = rows.map((r) => ({
            ...r,
            extraction: (r.extraction ?? null) as unknown as Json,
          }));
          const { error } = await admin
            .from("telegram_posts")
            .upsert(insert, { onConflict: "channel,message_id", ignoreDuplicates: true });
          if (error) throw new Error(`upsert_failed: ${error.message}`);
        },
        learnChatId: async (chat: LearnedChat) => {
          await admin
            .from("telegram_intake_channels")
            .update({ chat_id: chat.chatId, title: chat.title })
            .eq("handle", chat.handle)
            .is("chat_id", null);
        },
        logger,
      });
      logger.info({ ...summary }, "[sourcing] telegram bot ingest complete");
    } catch (err) {
      logger.error({ err: String(err) }, "[sourcing] telegram bot ingest crashed");
    }
  });

  return NextResponse.json({ ok: true, accepted: true }, { status: 202 });
}
