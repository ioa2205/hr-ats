/**
 * Bot-side ingest for company-OWNED Telegram CV channels.
 *
 * Why this exists: the Bot API has no get-history method — a bot only receives a
 * channel_post update as it is posted and can never re-fetch it. So the bot must
 * persist each post the moment it arrives. This module is that persistence:
 *   • parseGetUpdates — strict, pure parse of one getUpdates response;
 *   • attributePosts  — pure: map each post to the company that registered the
 *     channel, drop too-old / closed / contactless posts cheaply (no AI), and
 *     mark the rest as needing one classify call;
 *   • runTelegramIngest — the DI orchestration the route binds to live Supabase
 *     + Gemini + the Bot API. Everything it touches is injected, so the parse +
 *     attribution are unit-tested with fakes and zero network.
 *
 * Each surviving post is classified ONCE here and cached in telegram_posts, so
 * the search-time DB reader never pays for Gemini again.
 */
import { z } from "zod/v4";
import { isClosedSignal, withinAgeWindow } from "./recency";
import { prefilter } from "./classify";
import type { TelegramExtraction } from "./schema";

// ===================================================================
// getUpdates response (strict-ish) — we read channel_post / edited_channel_post.
// ===================================================================

const ChatSchema = z.object({
  id: z.number(),
  title: z.string().nullish(),
  username: z.string().nullish(),
  type: z.string().nullish(),
});

const ChannelPostSchema = z.object({
  message_id: z.number().int().nonnegative(),
  date: z.number().int().nonnegative(),
  chat: ChatSchema,
  text: z.string().nullish(),
});

const UpdateSchema = z.object({
  update_id: z.number().int().nonnegative(),
  channel_post: ChannelPostSchema.nullish(),
  edited_channel_post: ChannelPostSchema.nullish(),
});

const GetUpdatesSchema = z.object({
  ok: z.boolean(),
  result: z.array(UpdateSchema),
});

/** One channel post lifted out of a getUpdates batch. */
export interface ParsedChannelPost {
  updateId: number;
  chatId: number;
  username: string | null;
  title: string | null;
  messageId: number;
  /** ISO-8601 (converted from the unix `date`). */
  postedAt: string;
  text: string;
}

export interface ParsedUpdates {
  /** highest update_id seen — the next poll offsets from here. */
  maxUpdateId: number;
  posts: ParsedChannelPost[];
}

/**
 * Strictly parse a getUpdates payload into channel posts. Non-channel updates
 * (joins, edits without text, private messages) are skipped, not errors. Throws
 * only when the envelope itself is malformed (`ok:false` / wrong shape) so a
 * broken poll fails loud rather than silently ingesting nothing.
 */
export function parseGetUpdates(payload: unknown): ParsedUpdates {
  const parsed = GetUpdatesSchema.parse(payload);
  if (!parsed.ok) throw new Error("telegram_getupdates_not_ok");

  let maxUpdateId = 0;
  const posts: ParsedChannelPost[] = [];
  for (const update of parsed.result) {
    if (update.update_id > maxUpdateId) maxUpdateId = update.update_id;
    const post = update.channel_post ?? update.edited_channel_post;
    if (!post) continue;
    const text = (post.text ?? "").trim();
    if (text.length === 0) continue; // media-only / service posts carry no CV
    posts.push({
      updateId: update.update_id,
      chatId: post.chat.id,
      username: post.chat.username ? post.chat.username.toLowerCase() : null,
      title: post.chat.title ?? null,
      messageId: post.message_id,
      postedAt: new Date(post.date * 1000).toISOString(),
      text,
    });
  }
  return { maxUpdateId, posts };
}

// ===================================================================
// Attribution + cheap pre-classification (pure).
// ===================================================================

/** A registered owned channel, as the loader returns it. */
export interface IntakeChannel {
  companyId: string;
  handle: string;
  chatId: number | null;
}

/** A post attributed to a company, ready to upsert (classification may follow). */
export interface PlannedPost {
  companyId: string;
  channel: string;
  chatId: number;
  messageId: number;
  postedAt: string;
  text: string;
  url: string | null;
  /** true ⇒ worth one Gemini classify call; false ⇒ stored cheaply as 'other'. */
  needsAi: boolean;
  contactKey: string | null;
}

/** A chat id learned for a channel registered by handle (to backfill). */
export interface LearnedChat {
  handle: string;
  chatId: number;
  title: string | null;
}

export interface AttributionResult {
  planned: PlannedPost[];
  learned: LearnedChat[];
}

/**
 * Map each parsed post to the company that owns its channel, and decide cheaply
 * (no AI) whether it could be a candidate. A post is attributed by numeric
 * chat_id when known, else by channel username; posts from channels nobody
 * registered are ignored. Too-old, "found a job" (closed-signal), and
 * contactless / non-CV posts are marked needsAi=false and stored as noise so
 * they are never re-classified and never surfaced.
 */
export function attributePosts(
  posts: ParsedChannelPost[],
  channels: IntakeChannel[],
  nowMs: number,
  maxAgeDays: number,
): AttributionResult {
  const byChat = new Map<number, IntakeChannel>();
  const byHandle = new Map<string, IntakeChannel>();
  for (const ch of channels) {
    if (ch.chatId !== null) byChat.set(ch.chatId, ch);
    byHandle.set(ch.handle, ch);
  }

  const planned: PlannedPost[] = [];
  const learnedSeen = new Set<string>();
  const learned: LearnedChat[] = [];

  for (const post of posts) {
    const channel =
      byChat.get(post.chatId) ?? (post.username ? byHandle.get(post.username) : undefined);
    if (!channel) continue; // unregistered channel — not ours to ingest

    // Backfill the numeric chat id for a channel registered by handle.
    if (channel.chatId === null && !learnedSeen.has(channel.handle)) {
      learnedSeen.add(channel.handle);
      learned.push({ handle: channel.handle, chatId: post.chatId, title: post.title });
    }

    // Drop too-old posts outright — they would be purged anyway and must never
    // surface (the 90-day freshness rule, enforced here at ingest too).
    if (!withinAgeWindow(post.postedAt, maxAgeDays, nowMs)) continue;

    const url = post.username ? `https://t.me/${post.username}/${post.messageId}` : null;

    // Cheap drops (no Gemini): "found a job" closers and non-CV / contactless.
    if (isClosedSignal(post.text)) {
      planned.push(noise(channel, post, url));
      continue;
    }
    const pf = prefilter(post.text);
    if (!pf.keep || pf.contact === null) {
      planned.push(noise(channel, post, url));
      continue;
    }

    planned.push({
      companyId: channel.companyId,
      channel: channel.handle,
      chatId: post.chatId,
      messageId: post.messageId,
      postedAt: post.postedAt,
      text: post.text,
      url,
      needsAi: true,
      contactKey: pf.contact.key,
    });
  }

  return { planned, learned };
}

function noise(channel: IntakeChannel, post: ParsedChannelPost, url: string | null): PlannedPost {
  return {
    companyId: channel.companyId,
    channel: channel.handle,
    chatId: post.chatId,
    messageId: post.messageId,
    postedAt: post.postedAt,
    text: post.text,
    url,
    needsAi: false,
    contactKey: null,
  };
}

// ===================================================================
// DI orchestration.
// ===================================================================

/** A complete telegram_posts row the runner asks the store to upsert. */
export interface IngestPostRow {
  company_id: string;
  channel: string;
  chat_id: number;
  message_id: number;
  posted_at: string;
  text: string;
  url: string | null;
  source_mode: "bot";
  classification: string;
  confidence: number | null;
  extraction: TelegramExtraction | null;
  contact_key: string | null;
  classified_at: string | null;
}

export interface TelegramIngestDeps {
  /** Bot API getUpdates(offset). Returns the raw JSON payload. */
  fetchUpdates: (offset: number) => Promise<unknown>;
  /** active registered intake channels across all companies. */
  loadChannels: () => Promise<IntakeChannel[]>;
  /** last acknowledged update_id (poll offsets from +1). */
  loadOffset: () => Promise<number>;
  /** persist the new high-water update_id. */
  saveOffset: (updateId: number) => Promise<void>;
  /** classify one post (Gemini Flash). Throws on parse/schema failure. */
  classify: (text: string) => Promise<TelegramExtraction>;
  /** upsert posts (on conflict (channel, message_id) do nothing). */
  upsertPosts: (rows: IngestPostRow[]) => Promise<void>;
  /** backfill a learned numeric chat id for a handle-registered channel. */
  learnChatId: (chat: LearnedChat) => Promise<void>;
  maxAgeDays: number;
  now?: () => number;
  logger?: { warn: (o: unknown, m: string) => void; info: (o: unknown, m: string) => void };
}

export interface IngestSummary {
  fetched: number;
  attributed: number;
  classified: number;
  stored: number;
}

/**
 * One ingest pass: poll → attribute → classify the survivors → upsert. The
 * getUpdates batch is itself bounded (Telegram caps it at 100 per call), so
 * every survivor is classified in-pass — no backlog left behind. Idempotent:
 * the unique (channel, message_id) constraint + the advancing offset mean a
 * re-run never double-stores. A classify failure drops that one post (stored as
 * noise) but never aborts the batch.
 */
export async function runTelegramIngest(deps: TelegramIngestDeps): Promise<IngestSummary> {
  const nowMs = (deps.now ?? Date.now)();
  const channels = await deps.loadChannels();
  if (channels.length === 0) {
    return { fetched: 0, attributed: 0, classified: 0, stored: 0 };
  }

  const offset = await deps.loadOffset();
  const payload = await deps.fetchUpdates(offset + 1);
  const { maxUpdateId, posts } = parseGetUpdates(payload);
  const { planned, learned } = attributePosts(posts, channels, nowMs, deps.maxAgeDays);

  for (const chat of learned) {
    try {
      await deps.learnChatId(chat);
    } catch (err) {
      deps.logger?.warn({ handle: chat.handle, err: String(err) }, "[sourcing] telegram learn chat_id failed");
    }
  }

  let classified = 0;
  const rows: IngestPostRow[] = [];
  for (const post of planned) {
    if (!post.needsAi) {
      rows.push(toRow(post, "other", null, null, null));
      continue;
    }
    classified += 1;
    let extraction: TelegramExtraction;
    try {
      extraction = await deps.classify(post.text);
    } catch (err) {
      deps.logger?.warn(
        { ref: `${post.channel}:${post.messageId}`, err: String(err) },
        "[sourcing] telegram ingest classify failed; storing as noise",
      );
      rows.push(toRow(post, "other", null, null, new Date(nowMs).toISOString()));
      continue;
    }
    rows.push(
      toRow(
        post,
        extraction.classification,
        extraction.confidence,
        extraction,
        new Date(nowMs).toISOString(),
      ),
    );
  }

  if (rows.length > 0) await deps.upsertPosts(rows);
  if (maxUpdateId > 0) await deps.saveOffset(maxUpdateId);

  return { fetched: posts.length, attributed: planned.length, classified, stored: rows.length };
}

function toRow(
  post: PlannedPost,
  classification: string,
  confidence: number | null,
  extraction: TelegramExtraction | null,
  classifiedAt: string | null,
): IngestPostRow {
  return {
    company_id: post.companyId,
    channel: post.channel,
    chat_id: post.chatId,
    message_id: post.messageId,
    posted_at: post.postedAt,
    text: post.text,
    url: post.url,
    source_mode: "bot",
    classification,
    confidence,
    extraction,
    contact_key: post.contactKey,
    classified_at: classifiedAt,
  };
}
