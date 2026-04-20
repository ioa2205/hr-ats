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
    {
      title: labels.step1Title,
      body: labels.step1Body,
      mock: <DemoMockStep1 />,
    },
    {
      title: labels.step2Title,
      body: labels.step2Body,
      mock: <DemoMockStep2 />,
    },
    {
      title: labels.step3Title,
      body: labels.step3Body,
      mock: <DemoMockStep3 />,
    },
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
      <button
        type="button"
        onClick={open}
        aria-label={labels.triggerAriaLabel}
        className="btn-ghost"
      >
        <span
          aria-hidden
          className="inline-block"
          style={{
            width: 8,
            height: 8,
            background: "var(--persimmon)",
            borderRadius: "50%",
          }}
        />
        {labels.triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        onKeyDown={onKeyDown}
        aria-labelledby="tezhr-demo-title"
        className="tezhr-demo-dialog m-0 w-full max-w-[min(960px,96vw)] border-2 border-[var(--ink)] bg-[var(--paper-3)] p-0 text-[var(--ink)] backdrop:bg-[rgba(20,18,16,0.55)]"
        style={{ inset: "0", padding: 0 }}
      >
        <div className="flex flex-col">
          <div
            className="flex items-center justify-between border-b border-[var(--ink)] px-6 py-4"
            style={{ background: "var(--ink)", color: "var(--paper-3)" }}
          >
            <div className="flex min-w-0 items-baseline gap-3">
              <span
                className="mono text-[10px] tracking-[0.18em]"
                style={{ color: "var(--saffron)" }}
              >
                {labels.stepsTemplate
                  .replace("{n}", String(step + 1))
                  .replace("{total}", String(steps.length))}
              </span>
              <span
                id="tezhr-demo-title"
                className="serif truncate text-[22px] tracking-[-0.015em] italic"
              >
                {labels.heading}
              </span>
            </div>
            <button
              ref={closeBtnRef}
              type="button"
              onClick={close}
              aria-label={labels.closeLabel}
              className="grid h-9 w-9 place-items-center border border-[var(--paper-3)] text-[16px] leading-none transition-colors hover:bg-[var(--paper-3)] hover:text-[var(--ink)]"
            >
              <span aria-hidden>×</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr]">
            <div className="flex flex-col gap-4 p-6 md:p-8">
              <p
                className="serif text-[15px] leading-[1.55]"
                style={{ color: "var(--ink-3)", fontStyle: "italic" }}
              >
                {labels.body}
              </p>
              <ul className="mt-2 flex flex-col gap-0">
                {steps.map((s, i) => (
                  <li key={s.title}>
                    <button
                      type="button"
                      onClick={() => setStep(i)}
                      aria-pressed={step === i}
                      className="flex w-full items-start gap-4 border-t border-[var(--ink-4)] py-3 text-left transition-colors"
                      style={{ color: step === i ? "var(--ink)" : "var(--ink-3)" }}
                    >
                      <span
                        className="serif text-[22px] italic"
                        style={{ color: step === i ? "var(--persimmon-2)" : "var(--ink-4)" }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="flex-1">
                        <span
                          className="serif block text-[18px] tracking-[-0.01em]"
                          style={{ color: step === i ? "var(--ink)" : "var(--ink-3)" }}
                        >
                          {s.title}
                        </span>
                        <span
                          className="mt-1 block text-[12px] leading-[1.5]"
                          style={{ color: "var(--ink-3)" }}
                        >
                          {s.body}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-3 border-t border-[var(--ink-4)] pt-5">
                <Link
                  href={signupHref}
                  className="btn-primary"
                  style={{ padding: "12px 18px", fontSize: 13 }}
                >
                  {labels.ctaPrimary}
                </Link>
                <button type="button" onClick={close} className="btn-ghost">
                  {labels.ctaSecondary}
                </button>
              </div>
            </div>
            <div
              className="grid place-items-center border-t border-[var(--ink)] p-6 md:border-l md:border-t-0 md:p-8"
              style={{ background: "var(--paper-2)", minHeight: 360 }}
            >
              {steps[step]?.mock}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}

function DemoMockStep1() {
  return (
    <div
      className="w-full max-w-[420px] border border-[var(--ink)] bg-[var(--paper-3)] p-5 text-[var(--ink)]"
      style={{ boxShadow: "8px 8px 0 var(--ink)" }}
    >
      <div
        className="mono text-[9px] tracking-[0.18em]"
        style={{ color: "var(--ink-3)", marginBottom: 8 }}
      >
        JOB · #DES-042
      </div>
      <div className="serif text-[26px] leading-[1.05] tracking-[-0.02em]">
        Senior Product Designer
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        {["Figma", "B2B SaaS", "5+ лет", "RU+EN"].map((tag) => (
          <span
            key={tag}
            className="mono text-[10px] tracking-[0.06em]"
            style={{
              padding: "2px 8px",
              background: "var(--paper-2)",
              border: "1px solid var(--ink)",
            }}
          >
            {tag}
          </span>
        ))}
      </div>
      <div
        className="mono mt-4 flex items-center gap-2 text-[11px] tracking-[0.04em]"
        style={{ padding: "8px 10px", background: "var(--ink)", color: "var(--paper-3)" }}
      >
        → tezhr.uz/j/des-042
        <span style={{ marginLeft: "auto", color: "var(--persimmon)" }}>published</span>
      </div>
    </div>
  );
}

function DemoMockStep2() {
  return (
    <div
      className="w-full max-w-[420px] border border-[var(--ink)] bg-[var(--paper-3)] p-5 text-[var(--ink)]"
      style={{ boxShadow: "8px 8px 0 var(--ink)" }}
    >
      <div
        className="mono text-[9px] tracking-[0.18em]"
        style={{ color: "var(--ink-3)", marginBottom: 12 }}
      >
        UPLOAD · 247 / 247
      </div>
      <div className="flex flex-col gap-2">
        {[
          { n: "cv_diyora_rakhimova.pdf", kb: 248 },
          { n: "cv_aziz_karimov.pdf", kb: 192 },
          { n: "cv_madina_yusupova.pdf", kb: 301 },
          { n: "+ 244 more...", kb: 0 },
        ].map((r) => (
          <div
            key={r.n}
            className="flex items-center gap-2 border border-[var(--ink)] text-[11px]"
            style={{ padding: "6px 8px", background: "var(--paper-2)" }}
          >
            <span
              className="inline-block"
              style={{ width: 8, height: 8, background: "var(--persimmon)" }}
            />
            <span className="truncate">{r.n}</span>
            {r.kb > 0 && (
              <span
                className="mono ml-auto text-[10px]"
                style={{ color: "var(--ink-3)" }}
              >
                {r.kb} KB
              </span>
            )}
          </div>
        ))}
      </div>
      <div
        className="mono mt-4 text-[10px] tracking-[0.1em]"
        style={{ color: "var(--ikat)" }}
      >
        ✓ parsing · extracting fields · ranking
      </div>
    </div>
  );
}

function DemoMockStep3() {
  const rows = [
    { n: "Диёра Р.", s: 94, tone: "var(--persimmon)" },
    { n: "Азиз К.", s: 87, tone: "var(--ikat)" },
    { n: "Мадина Ю.", s: 82, tone: "var(--ikat)" },
    { n: "Тимур С.", s: 76, tone: "var(--ink-3)" },
  ];
  return (
    <div
      className="w-full max-w-[480px] border border-[var(--ink)] bg-[var(--paper-3)] p-5 text-[var(--ink)]"
      style={{ boxShadow: "8px 8px 0 var(--ink)" }}
    >
      <div
        className="mono text-[9px] tracking-[0.18em]"
        style={{ color: "var(--ink-3)", marginBottom: 12 }}
      >
        RANKED · top 4 / 247
      </div>
      {rows.map((r, i) => (
        <div
          key={r.n}
          className="flex items-center gap-3 text-[12px]"
          style={{
            padding: "10px 0",
            borderBottom: i < rows.length - 1 ? "1px dashed var(--ink-4)" : "none",
          }}
        >
          <span className="serif w-[18px] text-[14px]" style={{ color: "var(--ink-3)" }}>
            {i + 1}
          </span>
          <span className="serif flex-1 text-[15px]">{r.n}</span>
          <div
            className="flex-[1.5]"
            style={{
              height: 5,
              background: "var(--paper-2)",
              border: "1px solid var(--ink)",
            }}
          >
            <div style={{ height: "100%", width: `${r.s}%`, background: r.tone }} />
          </div>
          <span
            className="mono text-[12px] font-semibold"
            style={{ width: 26, textAlign: "right" }}
          >
            {r.s}
          </span>
        </div>
      ))}
    </div>
  );
}
