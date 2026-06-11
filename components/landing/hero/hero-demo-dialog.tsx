"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";

interface Labels {
  triggerLabel: string;
  triggerAriaLabel: string;
  heading: string;
  body: string;
  closeLabel: string;
  step1Title: string;
  step1Body: string;
  step2Title: string;
  step2Body: string;
  step3Title: string;
  step3Body: string;
  stepsTemplate: string;
  ctaPrimary: string;
  ctaSecondary: string;
}

interface Props {
  labels: Labels;
  signupHref: string;
}

export function HeroDemoDialog({ labels, signupHref }: Props) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const [step, setStep] = useState(0);

  const steps: Array<{ title: string; body: string; mock: React.ReactNode }> = [
    { title: labels.step1Title, body: labels.step1Body, mock: <DemoMockStep1 /> },
    { title: labels.step2Title, body: labels.step2Body, mock: <DemoMockStep2 /> },
    { title: labels.step3Title, body: labels.step3Body, mock: <DemoMockStep3 /> },
  ];

  const open = useCallback(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    setStep(0);
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    requestAnimationFrame(() => closeBtnRef.current?.focus());
  }, []);

  const close = useCallback(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (typeof dlg.close === "function") dlg.close();
    else dlg.removeAttribute("open");
  }, []);

  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    dlg.addEventListener("cancel", onCancel);
    return () => dlg.removeEventListener("cancel", onCancel);
  }, [close]);

  const onBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) close();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, steps.length - 1));
    if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
  };

  return (
    <>
      <button type="button" onClick={open} aria-label={labels.triggerAriaLabel} className="btn-ghost">
        <span aria-hidden style={{ display: "inline-flex" }}>
          <svg width={14} height={14} viewBox="0 0 16 16" fill="none">
            <path d="M5 3.5v9l7-4.5-7-4.5Z" fill="var(--ikat)" />
          </svg>
        </span>
        {labels.triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        onKeyDown={onKeyDown}
        aria-labelledby="tezhr-demo-title"
        className="tezhr-demo-dialog m-0 w-full max-w-[min(960px,96vw)] overflow-hidden rounded-2xl border bg-[var(--paper-3)] p-0 text-[var(--ink)] backdrop:bg-[rgba(20,18,16,0.45)]"
        style={{ inset: 0, borderColor: "var(--rule)" }}
      >
        <div className="flex flex-col">
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--rule)" }}>
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  padding: "3px 8px",
                  borderRadius: 999,
                  background: "var(--ikat-tint)",
                  color: "var(--ikat-on-tint)",
                }}
              >
                {labels.stepsTemplate.replace("{n}", String(step + 1)).replace("{total}", String(steps.length))}
              </span>
              <span id="tezhr-demo-title" className="truncate text-[18px] font-bold tracking-[-0.015em]">
                {labels.heading}
              </span>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={close}
              aria-label={labels.closeLabel}
              className="grid h-9 w-9 place-items-center rounded-lg border text-[18px] leading-none transition-colors hover:bg-[var(--paper-2)]"
              style={{ borderColor: "var(--rule-strong)" }}
            >
              <span aria-hidden>×</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr]">
            <div className="flex flex-col gap-4 p-6 md:p-8">
              <p className="text-[15px] leading-[1.55]" style={{ color: "var(--ink-3)" }}>
                {labels.body}
              </p>
              <ul className="mt-1 flex flex-col gap-0">
                {steps.map((s, i) => {
                  const isActive = step === i;
                  return (
                    <li key={s.title}>
                      <button
                        type="button"
                        onClick={() => setStep(i)}
                        aria-pressed={isActive}
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors"
                        style={{ background: isActive ? "var(--ikat-tint)" : "transparent" }}
                      >
                        <span
                          className="mono mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-semibold"
                          style={{
                            background: isActive ? "var(--ikat)" : "var(--paper-strong)",
                            color: isActive ? "var(--color-on-primary)" : "var(--ink-3)",
                          }}
                        >
                          {i + 1}
                        </span>
                        <span className="flex-1">
                          <span className="block text-[16px] font-semibold tracking-[-0.01em]" style={{ color: "var(--ink)" }}>
                            {s.title}
                          </span>
                          <span className="mt-1 block text-[13px] leading-[1.5]" style={{ color: "var(--ink-3)" }}>
                            {s.body}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap gap-3 border-t pt-5" style={{ borderColor: "var(--rule)" }}>
                <Link href={signupHref} className="btn-primary" style={{ minHeight: 40, padding: "10px 16px", fontSize: 14 }}>
                  {labels.ctaPrimary}
                </Link>
                <button type="button" onClick={close} className="btn-ghost" style={{ minHeight: 40, padding: "10px 16px", fontSize: 14 }}>
                  {labels.ctaSecondary}
                </button>
              </div>
            </div>
            <div className="grid place-items-center p-6 md:border-l md:p-8" style={{ background: "var(--paper-2)", borderColor: "var(--rule)", minHeight: 360 }}>
              {steps[step]?.mock}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

function MockShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full max-w-[420px] rounded-xl border bg-[var(--paper-3)] p-5 text-[var(--ink)]"
      style={{ borderColor: "var(--rule)", boxShadow: "var(--shadow-level-1)" }}
    >
      {children}
    </div>
  );
}

function DemoMockStep1() {
  return (
    <MockShell>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-4)", marginBottom: 8 }}>
        JOB · DES-042
      </div>
      <div className="text-[22px] font-bold tracking-[-0.02em]">Senior Product Designer</div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Figma", "B2B SaaS", "5+ yrs", "RU+EN"].map((tag) => (
          <span key={tag} className="lp-chip" style={{ fontSize: 10, padding: "3px 8px" }}>
            {tag}
          </span>
        ))}
      </div>
      <div
        className="mono mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-[11px]"
        style={{ background: "var(--ikat-tint)", color: "var(--ikat-on-tint)" }}
      >
        tezhr.uz/j/des-042
        <span style={{ marginLeft: "auto", fontWeight: 600 }}>published</span>
      </div>
    </MockShell>
  );
}

function DemoMockStep2() {
  return (
    <MockShell>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-4)", marginBottom: 12 }}>
        SCREENING · 247 / 247
      </div>
      <div className="flex flex-col gap-2">
        {[
          { n: "cv_diyora_rakhimova.pdf", kb: 248 },
          { n: "cv_aziz_karimov.pdf", kb: 192 },
          { n: "cv_madina_yusupova.pdf", kb: 301 },
          { n: "+ 244 more", kb: 0 },
        ].map((r) => (
          <div
            key={r.n}
            className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[11px]"
            style={{ background: "var(--paper-2)", border: "1px solid var(--rule)" }}
          >
            <span className="inline-block" style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--leaf)" }} aria-hidden />
            <span className="truncate">{r.n}</span>
            {r.kb > 0 && (
              <span className="mono ml-auto" style={{ fontSize: 10, color: "var(--ink-4)" }}>
                {r.kb} KB
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="mono mt-4 flex items-center gap-1.5 text-[10px]" style={{ letterSpacing: "0.08em", color: "var(--ikat)" }}>
        <span className="lp-live-dot inline-block" style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ikat)" }} aria-hidden />
        parsing · extracting fields · ranking
      </div>
    </MockShell>
  );
}

function DemoMockStep3() {
  const rows = [
    { n: "Диёра Р.", s: 94, top: true },
    { n: "Азиз К.", s: 87, top: false },
    { n: "Мадина Ю.", s: 82, top: false },
    { n: "Тимур С.", s: 76, top: false },
  ];
  return (
    <MockShell>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-4)", marginBottom: 12 }}>
        RANKED · top 4 / 247
      </div>
      {rows.map((r, i) => (
        <div
          key={r.n}
          className="flex items-center gap-3 text-[12px]"
          style={{ padding: "10px 0", borderBottom: i < rows.length - 1 ? "1px solid var(--rule)" : "none" }}
        >
          <span className="mono" style={{ width: 16, color: "var(--ink-4)" }}>
            {i + 1}
          </span>
          <span className="flex-1 font-semibold" style={{ letterSpacing: "-0.01em" }}>
            {r.n}
          </span>
          <div className="flex-[1.4]" style={{ height: 6, borderRadius: 999, background: "var(--paper-strong)", overflow: "hidden" }} aria-hidden>
            <div style={{ height: "100%", width: `${r.s}%`, background: r.top ? "var(--ikat)" : "var(--rule-strong)", borderRadius: 999 }} />
          </div>
          <span className="mono" style={{ width: 24, textAlign: "right", fontWeight: 700 }}>
            {r.s}
          </span>
        </div>
      ))}
    </MockShell>
  );
}
