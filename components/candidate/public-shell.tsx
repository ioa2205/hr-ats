import Link from "next/link";
import type { ReactNode } from "react";
import { getLocale, t } from "@/lib/i18n";
import { LanguageToggle } from "@/components/candidate/language-toggle";
import { TezSignalWordmark } from "@/components/brand/tez-signal";

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
      className="tezhr flex min-h-screen flex-col bg-[var(--color-canvas)]"
      style={{ fontSize: "14.5px", lineHeight: 1.5 }}
    >
      <header className="sticky top-0 z-20 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-canvas)_85%,transparent)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[960px] items-center justify-between px-4">
          <Link
            href="/"
            className="inline-flex rounded-[var(--radius-sm)] text-[var(--color-text)] outline-none"
          >
            <TezSignalWordmark size={17} domain />
          </Link>
          <LanguageToggle currentLocale={locale} />
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pt-10 pb-12 sm:pt-14">
        <div className={`w-full ${maxWidth}`}>{children}</div>
      </main>

      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-[10.5px] tracking-[0.02em] text-[var(--color-text-subtle)]">
          <span className="inline-flex items-center gap-1.5">
            {t("apply.powered_by", locale)}{" "}
            <Link
              href="/"
              className="font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              TezHR
            </Link>
          </span>
          <span>{t("apply.secured_by", locale)}</span>
        </div>
      </footer>
    </div>
  );
}
