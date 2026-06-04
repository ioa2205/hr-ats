import "server-only";

import { hhAvailableForCompany } from "./connectors/hh";
import {
  telegramBotIntakeConfigured,
  telegramConfiguredFromEnv,
} from "./connectors/telegram";
import type { SourceKind } from "./types";

/**
 * Sources actually configured for a company — the selectable ceiling. Shared by
 * the trigger route (which intersects the user's selection with it) and the
 * server pages that render the config dialog (so both agree on what's on offer).
 * internal_pool is always available; hh needs an employer connection; telegram
 * needs MTProto env creds or a bot-intake channel.
 */
export async function availableSourcesForCompany(companyId: string): Promise<SourceKind[]> {
  const sources: SourceKind[] = ["internal_pool"];
  if (await hhAvailableForCompany(companyId)) sources.push("hh");
  if (telegramConfiguredFromEnv() || telegramBotIntakeConfigured()) sources.push("telegram");
  return sources;
}
