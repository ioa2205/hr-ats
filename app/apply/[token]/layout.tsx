import Link from "next/link";
import { getApplyLocale, getMessages, t } from "@/lib/i18n";
import { TranslationsProvider } from "@/lib/i18n/provider";
import { LanguageToggle } from "@/components/candidate/language-toggle";
import { TezSignalWordmark } from "@/components/brand/tez-signal";

export default async function ApplyLayout({ children }: { children: React.ReactNode }) {
  const locale = await getApplyLocale();
  const messages = getMessages(locale);

  return (
    <TranslationsProvider locale={locale} messages={messages}>
      <div className="tezhr bg-bone min-h-screen" style={{ fontSize: "14.5px", lineHeight: 1.5 }}>
        <header className="border-rule bg-paper/70 sticky top-0 z-10 border-b backdrop-blur">
          <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
            <Link href="/" className="text-ink inline-flex outline-none">
              <TezSignalWordmark size={17} domain />
            </Link>
            <LanguageToggle currentLocale={locale} />
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 pt-6 pb-16 sm:pt-10">{children}</main>

        <footer className="border-rule/60 mt-auto border-t">
          <div className="text-ink-5 mx-auto flex max-w-2xl items-center justify-between px-4 py-4 text-[10.5px] tracking-[0.02em]">
            <span>
              {t("apply.powered_by", locale)}{" "}
              <Link href="/" className="text-ink-3 hover:text-ink font-semibold">
                TezHR
              </Link>
            </span>
            <span>{t("apply.secured_by", locale)}</span>
          </div>
        </footer>
      </div>
    </TranslationsProvider>
  );
}
