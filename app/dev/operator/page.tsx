import { notFound } from "next/navigation";
import { getMessages } from "@/lib/i18n";
import { TranslationsProvider } from "@/lib/i18n/provider";
import type { Locale } from "@/lib/i18n/types";
import { OperatorDevHarness, type OperatorView } from "./operator-dev-harness";

/**
 * Gated visual-QA harness for the Phase 9 operator console. Renders the real
 * operator surfaces with a mocked operator API (see operator-dev-harness.tsx) so
 * RU/UZ/EN × light/dark × widths can be driven by Playwright without seeding
 * Supabase.
 *
 * Query params: ?view=<view>&locale=ru|uz|en&theme=light|dark
 */

const VIEWS: OperatorView[] = [
  "dashboard",
  "companies",
  "inbox",
  "incidents",
  "settings",
  "company-detail",
  "impersonation",
];

export default async function OperatorPreviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.ENABLE_DESIGN_REVIEW !== "1" &&
    process.env.PLAYWRIGHT_DEV !== "1"
  ) {
    notFound();
  }

  const sp = await searchParams;
  const view = (VIEWS.includes(sp.view as OperatorView) ? sp.view : "dashboard") as OperatorView;
  const locale = (["ru", "uz", "en"].includes(sp.locale as string) ? sp.locale : "ru") as Locale;
  const theme = sp.theme === "dark" ? "dark" : "light";
  const messages = getMessages(locale);

  return (
    <TranslationsProvider locale={locale} messages={messages}>
      <OperatorDevHarness view={view} theme={theme} />
    </TranslationsProvider>
  );
}
