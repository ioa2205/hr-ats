/**
 * Env wiring for the Telegram connector. Keeps env/IO/Gemini out of the pure
 * modules: the connector + recency + classify + normalize are all testable
 * without this file.
 *
 * `createTelegramConnectorFromEnv` returns null when the MTProto credentials or
 * the channel allow-list are absent, so the worker simply omits Telegram and
 * sources internal-pool / hh only — no config, no crash. Provide
 * TELEGRAM_API_ID + TELEGRAM_API_HASH + TELEGRAM_SESSION + TELEGRAM_CHANNELS and
 * it joins every search, exactly like the hh connector.
 */
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { callGeminiFlashJson } from "@/lib/gemini/call-flash";
import { parseGeminiJson } from "../../parse";
import type { SourceConnector } from "../../types";
import { createTelegramConnector } from "./connector";
import { GramJsTelegramReader } from "./reader";
import {
  TELEGRAM_CLASSIFY_SYSTEM,
  buildTelegramClassifyPrompt,
} from "./classify";
import { TelegramExtractionZod, telegramExtractionSchema, type TelegramExtraction } from "./schema";

/** Parse the comma-separated allow-list into clean channel handles (no '@'). */
export function parseChannels(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(",")) {
    const handle = part.trim().replace(/^@/, "").toLowerCase();
    if (handle.length === 0 || seen.has(handle)) continue;
    seen.add(handle);
    out.push(handle);
  }
  return out;
}

/** Are the Telegram credentials AND an allow-list present? */
export function telegramConfiguredFromEnv(): boolean {
  return Boolean(
    env.TELEGRAM_API_ID &&
      env.TELEGRAM_API_HASH &&
      env.TELEGRAM_SESSION &&
      parseChannels(env.TELEGRAM_CHANNELS).length > 0,
  );
}

/** Gemini Flash classify+extract, JSON-mode + Zod-validated (fail-closed). */
async function classifyWithGemini(text: string): Promise<TelegramExtraction> {
  const { text: raw } = await callGeminiFlashJson({
    systemInstruction: TELEGRAM_CLASSIFY_SYSTEM,
    userPrompt: buildTelegramClassifyPrompt(text),
    responseSchema: telegramExtractionSchema,
  });
  return parseGeminiJson(raw, TelegramExtractionZod, "telegram_classify");
}

export interface TelegramFromEnvOptions {
  /** company-scoped suppression of contacts already in the candidate pool. */
  isKnownContact?: (contactKey: string) => boolean;
}

/** Build the live Telegram connector, or null when unconfigured. */
export function createTelegramConnectorFromEnv(
  options: TelegramFromEnvOptions = {},
): SourceConnector | null {
  if (!telegramConfiguredFromEnv()) return null;
  const apiId = Number.parseInt(env.TELEGRAM_API_ID as string, 10);
  if (!Number.isInteger(apiId) || apiId <= 0) {
    logger.error({ value: env.TELEGRAM_API_ID }, "[sourcing] TELEGRAM_API_ID is not a valid integer");
    return null;
  }
  const reader = new GramJsTelegramReader({
    apiId,
    apiHash: env.TELEGRAM_API_HASH as string,
    session: env.TELEGRAM_SESSION as string,
    perChannelLimit: env.TELEGRAM_PER_CHANNEL_LIMIT,
  });
  return createTelegramConnector({
    reader,
    classify: classifyWithGemini,
    isConfigured: telegramConfiguredFromEnv,
    channels: parseChannels(env.TELEGRAM_CHANNELS),
    maxAgeDays: env.TELEGRAM_MAX_AGE_DAYS,
    perChannelLimit: env.TELEGRAM_PER_CHANNEL_LIMIT,
    isKnownContact: options.isKnownContact,
    logger,
  });
}
