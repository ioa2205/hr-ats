import Link from "next/link";
import type { ReactNode } from "react";
import { getLocale, t } from "@/lib/i18n";
import { LanguageToggle } from "@/components/candidate/language-toggle";

interface PublicShellProps {
  children: ReactNode;
  /** Max inner width. Auth forms use "sm" (~440px); apply/interview use "md" (~520px). */
  width?: "sm" | "md";
}

/**
 * Shared chrome for candidate-adjacent public pages (/auth, /onboarding,
 * /interview, /apply). Brand bar with TezHR.uz wordmark + locale toggle,
 * bone-tinted shell, footer.
 */
export async function PublicShell({ children, width = "sm" }: PublicShellProps) {
  const locale = await getLocale();
  const maxWidth = width === "md" ? "max-w-[520px]" : "max-w-[440px]";

  return (
    <div
      className="tezhr bg-bone flex min-h-screen flex-col"
      style={{ fontSize: "14.5px", lineHeight: 1.5 }}
    >
      <header className="border-rule bg-paper/70 border-b backdrop-blur">
        <div className="mx-auto flex h-12 max-w-[960px] items-center justify-between px-4">
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

      <main className="flex flex-1 items-start justify-center px-4 pb-12 pt-10 sm:pt-14">
        <div className={`w-full ${maxWidth}`}>{children}</div>
      </main>

      <footer className="border-rule/60 border-t">
        <div className="text-ink-5 mx-auto flex max-w-[960px] items-center justify-between gap-3 px-4 py-4 text-[10.5px] tracking-[0.02em]">
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
  );
}
