import type { ReactNode } from "react";

export function Section({
  title,
  note,
  children,
}: {
  title: string;
  note: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-[var(--color-line)] py-10">
      <div className="mb-6 grid gap-2 md:grid-cols-[220px_1fr]">
        <h2 className="text-sm font-bold tracking-[-0.02em]">{title}</h2>
        <p className="max-w-2xl text-sm text-[var(--color-text-muted)]">{note}</p>
      </div>
      {children}
    </section>
  );
}

/** Labelled mini-frame used to title an individual demo within a section. */
export function Demo({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="mb-3 text-xs font-bold tracking-[0.1em] text-[var(--color-text-subtle)] uppercase">
        {label}
      </p>
      {children}
    </div>
  );
}
