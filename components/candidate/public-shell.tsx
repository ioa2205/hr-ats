import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { getLocale, t } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";
import { LanguageToggle } from "@/components/candidate/language-toggle";
import { TezSignalWordmark } from "@/components/brand/tez-signal";

interface PublicShellProps {
  children: ReactNode;
  /**
   * Max inner width. Auth forms use "sm" (~440px); the interview flow uses
   * "md" (~520px); the content-heavy apply flow uses "lg" (~600px).
   */
  width?: "sm" | "md" | "lg";
  /**
   * Pre-resolved locale for the chrome (header toggle + footer). When omitted,
   * falls back to the signed-in/cookie locale. Candidate routes pass the
   * apply-locale (cookie → company default → ru) so the chrome and content agree.
   */
  locale?: Locale;
}

const MAX_WIDTH: Record<NonNullable<PublicShellProps["width"]>, string> = {
  sm: "max-w-[440px]",
  md: "max-w-[520px]",
  lg: "max-w-[600px]",
};

/**
 * Shared chrome for candidate-adjacent public pages (/auth, /onboarding,
 * /interview, /apply). A sticky translucent brand bar carries the Tez Signal
 * wordmark + locale toggle, the warm canvas frames the content, and a calm
 * trust footer states the powered-by / secured-by relationship. Semantic
 * tokens only — the same surface in light and dark.
 */
export async function PublicShell({ children, width = "sm", locale }: PublicShellProps) {
  const resolvedLocale = locale ?? (await getLocale());
  const maxWidth = MAX_WIDTH[width];

  return (
    <div
      className="tezhr flex min-h-screen flex-col bg-[var(--color-canvas)]"
      style={{ fontSize: "14.5px", lineHeight: 1.5 }}
    >
      <header className="glass-bar sticky top-0 z-20 border-b border-[var(--color-line)]">
        <div className="mx-auto flex h-14 max-w-[960px] items-center justify-between px-4">
          <Link
            href="/"
            className="inline-flex rounded-[var(--radius-sm)] text-[var(--color-text)] outline-none"
            aria-label="TezHR.uz"
          >
            <TezSignalWordmark size={17} domain />
          </Link>
          <LanguageToggle currentLocale={resolvedLocale} />
        </div>
      </header>

      <main className="signal-mesh flex flex-1 items-start justify-center px-4 pt-8 pb-16 sm:pt-12">
        <div className={`w-full ${maxWidth}`}>{children}</div>
      </main>

      <footer className="border-t border-[var(--color-line)]">
        <div className="mx-auto flex max-w-[960px] flex-wrap items-center justify-between gap-3 px-4 py-4 text-[11px] tracking-[0.01em] text-[var(--color-text-subtle)]">
          <span className="inline-flex items-center gap-1.5">
            {t("apply.powered_by", resolvedLocale)}{" "}
            <Link
              href="/"
              className="font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            >
              TezHR
            </Link>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            {t("apply.secured_by", resolvedLocale)}
          </span>
        </div>
      </footer>
    </div>
  );
}
