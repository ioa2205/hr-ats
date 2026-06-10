"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { TezSignalMark, TezSignalWordmark } from "@/components/brand/tez-signal";
import { ToastProvider, TooltipProvider } from "@/components/ui";
import { cn } from "@/lib/utils";
import { Section } from "./review-section";
import { ComponentShowcase } from "./component-showcase";

type Theme = "light" | "dark";
type Locale = "ru" | "uz" | "en";

const COPY: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    body: string;
  }
> = {
  ru: {
    eyebrow: "Система найма",
    title: "Лучшие кандидаты видны сразу.",
    body: "TezHR превращает поток резюме в ясный, объяснимый шорт-лист.",
  },
  uz: {
    eyebrow: "Yollash tizimi",
    title: "Eng kuchli nomzodlar darhol ko'rinadi.",
    body: "TezHR rezyumelar oqimini aniq va tushunarli qisqa ro'yxatga aylantiradi.",
  },
  en: {
    eyebrow: "Hiring signal system",
    title: "The strongest candidates are clear immediately.",
    body: "TezHR turns applicant noise into a clear, explainable shortlist.",
  },
};

const COLORS = [
  ["Canvas", "--color-canvas"],
  ["Surface", "--color-surface"],
  ["Surface subtle", "--color-surface-subtle"],
  ["Surface strong", "--color-surface-strong"],
  ["Text", "--color-text"],
  ["Text muted", "--color-text-muted"],
  ["Line", "--color-line"],
  ["Tez Lapis", "--color-primary"],
  ["Lapis container", "--color-primary-container"],
  ["Persimmon Signal", "--color-accent"],
  ["Success", "--color-success"],
  ["Warning", "--color-warning"],
  ["Danger", "--color-danger"],
  ["Info", "--color-info"],
] as const;

function ReviewHeader({
  theme,
  setTheme,
  locale,
  setLocale,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
  locale: Locale;
  setLocale: (l: Locale) => void;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-[var(--color-line)] bg-[color-mix(in_srgb,var(--color-canvas)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-16 max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-4">
          <TezSignalWordmark size={18} />
          <span className="text-xs font-semibold tracking-[0.08em] text-[var(--color-text-subtle)] uppercase">
            Component system review
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] p-1">
            {(["ru", "uz", "en"] as Locale[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setLocale(item)}
                aria-pressed={locale === item}
                className={cn(
                  "min-h-9 rounded-[var(--radius-sm)] px-3 text-xs font-bold uppercase",
                  locale === item
                    ? "bg-[var(--color-primary-container)] text-[var(--color-on-primary-container)]"
                    : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-subtle)]",
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="grid min-h-11 min-w-11 place-items-center rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-subtle)]"
            aria-label={theme === "light" ? "Use dark theme" : "Use light theme"}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}

export function DesignSystemReview() {
  const [theme, setTheme] = useState<Theme>("light");
  const [locale, setLocale] = useState<Locale>("ru");
  const copy = COPY[locale];

  // Mirror the review theme onto <html> so Radix portals (dialog, sheet,
  // select, dropdown, tooltip) inherit the correct token set in dark mode.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.getAttribute("data-theme");
    root.setAttribute("data-theme", theme);
    return () => {
      if (previous === null) root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", previous);
    };
  }, [theme]);

  return (
    <div
      data-testid="design-system-review"
      data-theme={theme}
      className={cn(
        "min-h-screen bg-[var(--color-canvas)] font-[var(--font-sans)] text-[var(--color-text)] transition-colors duration-200",
        theme === "dark" && "theme-dark",
      )}
    >
      <TooltipProvider>
        <ToastProvider>
          <ReviewHeader theme={theme} setTheme={setTheme} locale={locale} setLocale={setLocale} />

          <main className="mx-auto max-w-[1180px] px-5 pb-16">
            <div className="grid gap-10 py-14 lg:grid-cols-[1fr_0.65fr] lg:items-end">
              <div>
                <p className="mb-4 text-xs font-bold tracking-[0.14em] text-[var(--color-primary)] uppercase">
                  {copy.eyebrow}
                </p>
                <h1 className="max-w-3xl text-[clamp(2.5rem,7vw,5.8rem)] leading-[0.98] font-extrabold tracking-[-0.065em]">
                  {copy.title}
                </h1>
              </div>
              <div className="border-l-4 border-[var(--color-accent)] pl-5">
                <p className="text-lg leading-relaxed text-[var(--color-text-muted)]">{copy.body}</p>
                <p className="data-mono mt-4 text-xs text-[var(--color-text-subtle)]">
                  Phase 2 / unified primitives / UZ-RU-EN
                </p>
              </div>
            </div>

            <Section
              title="Tez Signal"
              note="A one-color geometric T. Chamfered tile geometry creates forward motion without losing clarity at 16px."
            >
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
                  <TezSignalWordmark size={28} />
                </div>
                <div className="flex items-end gap-5 rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-primary)] p-6 text-[var(--color-on-primary)]">
                  {[16, 24, 40, 64].map((size) => (
                    <TezSignalMark
                      key={size}
                      size={size}
                      className="text-current"
                      title={`${size}px mark`}
                    />
                  ))}
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-text)] p-6 text-[var(--color-canvas)]">
                  <TezSignalWordmark size={24} monochrome className="text-current" />
                  <p className="mt-4 text-xs opacity-75">One-color lockup</p>
                </div>
              </div>
            </Section>

            <Section
              title="Semantic color"
              note="Roles stay stable between themes. Persimmon is a pulse, never the default action color."
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
                {COLORS.map(([label, token]) => (
                  <div
                    key={token}
                    className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)]"
                  >
                    <div
                      className="h-16 border-b border-[var(--color-line)]"
                      style={{ background: `var(${token})` }}
                    />
                    <div className="p-3">
                      <p className="text-xs font-semibold">{label}</p>
                      <p className="data-mono mt-1 text-[9px] text-[var(--color-text-subtle)]">
                        {token}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title="Typography"
              note="Manrope carries product and brand. JetBrains Mono is reserved for compact data, codes, and timestamps."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
                  <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
                    Manrope
                  </p>
                  <p className="mt-4 text-4xl font-extrabold tracking-[-0.05em]">
                    Tez, aniq, ishonchli.
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-[var(--color-text-muted)]">
                    {copy.body}
                  </p>
                </div>
                <div className="rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)] p-6">
                  <p className="text-xs font-bold tracking-[0.12em] text-[var(--color-text-subtle)] uppercase">
                    JetBrains Mono / data
                  </p>
                  <div className="data-mono mt-4 grid grid-cols-2 gap-3 text-sm">
                    <span>FIT_SCORE</span>
                    <strong className="text-[var(--color-primary)]">94.2%</strong>
                    <span>RECEIVED</span>
                    <strong>09:42:18</strong>
                    <span>LANGUAGE</span>
                    <strong>UZ / RU / EN</strong>
                  </div>
                </div>
              </div>
            </Section>

            <ComponentShowcase locale={locale} />

            <Section
              title="Contrast contract"
              note="Required text pairs meet WCAG AA in both modes; focus and control boundaries meet non-text contrast."
            >
              <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--color-line)] bg-[var(--color-surface)]">
                <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                  <thead className="bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]">
                    <tr>
                      <th className="p-4">Pair</th>
                      <th className="p-4">Light</th>
                      <th className="p-4">Dark</th>
                      <th className="p-4">Requirement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["Text / canvas", "15.74:1", "16.68:1", "4.5:1"],
                      ["Muted text / canvas", "6.44:1", "10.73:1", "4.5:1"],
                      ["Primary / surface", "7.23:1", "8.19:1", "4.5:1"],
                      ["On primary / primary", "7.23:1", "7.62:1", "4.5:1"],
                      ["Danger / surface", "6.53:1", "8.47:1", "4.5:1"],
                    ].map((row) => (
                      <tr key={row[0]} className="border-t border-[var(--color-line)]">
                        {row.map((cell, index) => (
                          <td key={cell} className={cn("p-4", index > 0 && "data-mono text-xs")}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          </main>
        </ToastProvider>
      </TooltipProvider>
    </div>
  );
}
