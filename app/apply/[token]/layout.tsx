import Link from "next/link";
import { getApplyLocale, getMessages, t } from "@/lib/i18n";
import { TranslationsProvider } from "@/lib/i18n/provider";
import { LanguageToggle } from "@/components/candidate/language-toggle";

export default async function ApplyLayout({ children }: { children: React.ReactNode }) {
  const locale = await getApplyLocale();
  const messages = getMessages(locale);

  return (
    <TranslationsProvider locale={locale} messages={messages}>
      <div
        className="tezhr bg-bone min-h-screen"
        style={{ fontSize: "14.5px", lineHeight: 1.5 }}
      >
        <header className="border-rule bg-paper/70 sticky top-0 z-10 border-b backdrop-blur">
          <div className="mx-auto flex h-12 max-w-2xl items-center justify-between px-4">
            <Link
              href="/"
              className="text-ink flex items-baseline gap-0.5 leading-none tracking-[-0.02em] outline-none"
            >
              <span className="text-[17px] font-bold">TezHR</span>
              <span className="text-ink-5 text-[10px] font-semibold tracking-[0.12em]">.uz</span>
            </Link>
            <LanguageToggle currentLocale={locale} />
          </div>
        </header>

        <main className="mx-auto max-w-2xl px-4 pb-16 pt-6 sm:pt-10">{children}</main>

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
