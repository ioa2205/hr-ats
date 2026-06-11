import { getApplyLocale, getMessages } from "@/lib/i18n";
import { TranslationsProvider } from "@/lib/i18n/provider";
import { PublicShell } from "@/components/candidate/public-shell";

export default async function ApplyLayout({ children }: { children: React.ReactNode }) {
  const locale = await getApplyLocale();
  const messages = getMessages(locale);

  return (
    <TranslationsProvider locale={locale} messages={messages}>
      <PublicShell width="lg" locale={locale}>
        {children}
      </PublicShell>
    </TranslationsProvider>
  );
}
