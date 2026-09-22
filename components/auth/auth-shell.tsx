import Link from "next/link";
import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { getLocale, t } from "@/lib/i18n";
import { LanguageToggle } from "@/components/candidate/language-toggle";
import { AccountStory } from "./account-story";

interface AuthShellProps {
  children: ReactNode;
  width?: "sm" | "md" | "lg";
}

const CONTENT_WIDTH: Record<NonNullable<AuthShellProps["width"]>, string> = {
  sm: "max-w-[470px]",
  md: "max-w-[540px]",
  lg: "max-w-[620px]",
};

/** Account-only shell based on the approved editorial craft direction. */
export async function AuthShell({ children, width = "sm" }: AuthShellProps) {
  const locale = await getLocale();

  return (
    <div className="account-shell min-h-dvh bg-[var(--account-paper)] text-[var(--color-text)]">
      <header className="account-header sticky top-0 z-30 bg-[var(--account-paper)]">
        <div className="flex h-[68px] items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="account-wordmark inline-flex rounded-[var(--radius-sm)] text-[var(--color-text)]"
            aria-label="TezHR.uz"
          >
            TezHR
          </Link>
          <LanguageToggle currentLocale={locale} variant="account" />
        </div>
      </header>

      <div className="account-layout lg:grid lg:grid-cols-[minmax(0,1.58fr)_minmax(520px,0.92fr)]">
        <AccountStory />

        <div className="account-form-rail flex min-h-0 flex-col bg-[var(--account-paper)] lg:min-h-[calc(100dvh-68px)]">
          <main className="flex min-w-0 flex-1 items-center justify-center px-5 py-9 sm:px-10 sm:py-12 lg:px-12 lg:py-14">
            <div className={`w-full ${CONTENT_WIDTH[width]}`}>{children}</div>
          </main>

          <footer className="mx-5 flex flex-wrap items-center justify-between gap-3 py-5 text-[12px] tracking-[0.01em] text-[var(--color-text-subtle)] sm:mx-10 lg:mx-12">
            <span className="inline-flex items-center gap-1.5">
              {t("apply.powered_by", locale)}{" "}
              <Link
                href="/"
                className="font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                TezHR
              </Link>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              {t("apply.secured_by", locale)}
            </span>
          </footer>
        </div>
      </div>
    </div>
  );
}
