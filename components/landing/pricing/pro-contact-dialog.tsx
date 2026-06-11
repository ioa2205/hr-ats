"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { submitContactMessage } from "@/lib/actions/contact";

interface Labels {
  triggerLabel: string;
  heading: string;
  intro: string;
  closeLabel: string;
  nameLabel: string;
  emailLabel: string;
  companyLabel: string;
  teamSizeLabel: string;
  channelLabel: string;
  messageLabel: string;
  messagePlaceholder: string;
  submit: string;
  submitting: string;
  successHeading: string;
  successBody: string;
  errorGeneric: string;
  errorRateLimited: string;
  channelTelegram: string;
  channelPhone: string;
  channelEmail: string;
  teamSizes: string[];
}

const labelStyle: CSSProperties = {
  fontFamily: "var(--font-jetbrains-mono),monospace",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ink-3)",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "11px 13px",
  fontSize: 15,
  background: "var(--paper)",
  border: "1px solid var(--rule-strong)",
  borderRadius: "var(--radius-md)",
  color: "var(--ink)",
  fontFamily: "var(--font-manrope),sans-serif",
  outline: "none",
};

export function ProContactDialog({ labels }: { labels: Labels }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const open = useCallback(() => {
    setOk(false);
    setErr(null);
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (typeof dlg.showModal === "function") dlg.showModal();
    else dlg.setAttribute("open", "");
    requestAnimationFrame(() => firstFieldRef.current?.focus());
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

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const company = String(data.get("company") ?? "").trim();
    const team = String(data.get("team_size") ?? "").trim();
    const channel = String(data.get("channel") ?? "").trim();
    const raw = String(data.get("message") ?? "").trim();
    const message = [
      raw || "(empty message)",
      team ? `— ${labels.teamSizeLabel}: ${team}` : null,
      channel ? `— ${labels.channelLabel}: ${channel}` : null,
      "— Source: landing/pricing/pro",
    ]
      .filter(Boolean)
      .join("\n");
    const fd = new FormData();
    fd.set("name", name);
    fd.set("email", email);
    fd.set("company", company);
    fd.set("message", message);
    startTransition(async () => {
      const res = await submitContactMessage(null, fd);
      if (res?.ok) {
        setOk(true);
        form.reset();
      } else if (res?.error === "too_many") {
        setErr(labels.errorRateLimited);
      } else {
        setErr(labels.errorGeneric);
      }
    });
  };

  const onBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) close();
  };

  return (
    <>
      <button type="button" onClick={open} className="btn-ghost w-full">
        {labels.triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        aria-labelledby="tezhr-pro-dialog-title"
        className="m-0 w-full max-w-[min(640px,96vw)] overflow-hidden rounded-2xl border bg-[var(--paper-3)] p-0 text-[var(--ink)] backdrop:bg-[rgba(20,18,16,0.45)]"
        style={{ inset: 0, borderColor: "var(--rule)" }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--rule)" }}>
          <div className="flex items-center gap-3">
            <span className="mono" style={{ fontSize: 10, letterSpacing: "0.14em", padding: "3px 8px", borderRadius: 999, background: "var(--ikat-tint)", color: "var(--ikat-on-tint)" }}>
              TezHR · Pro
            </span>
            <span id="tezhr-pro-dialog-title" className="text-[19px] font-bold tracking-[-0.015em]">
              {labels.heading}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={labels.closeLabel}
            className="grid h-9 w-9 place-items-center rounded-lg border text-[18px] leading-none transition-colors hover:bg-[var(--paper-2)]"
            style={{ borderColor: "var(--rule-strong)" }}
          >
            ×
          </button>
        </div>
        {ok ? (
          <div className="flex flex-col items-start gap-4 p-8">
            <h3 className="lp-h2 m-0" style={{ fontSize: 28, color: "var(--ikat)" }}>
              {labels.successHeading}
            </h3>
            <p className="m-0 max-w-[440px] text-[16px] leading-[1.55]" style={{ color: "var(--ink-2)" }}>
              {labels.successBody}
            </p>
            <button type="button" onClick={close} className="btn-ghost">
              {labels.closeLabel}
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4 p-7">
            <label className="flex flex-col gap-1.5">
              <span style={labelStyle}>{labels.nameLabel}</span>
              <input ref={firstFieldRef} name="name" required minLength={2} maxLength={120} style={inputStyle} />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span style={labelStyle}>{labels.emailLabel}</span>
                <input name="email" type="email" required maxLength={200} style={inputStyle} />
              </label>
              <label className="flex flex-col gap-1.5">
                <span style={labelStyle}>{labels.companyLabel}</span>
                <input name="company" maxLength={200} style={inputStyle} />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span style={labelStyle}>{labels.teamSizeLabel}</span>
                <select name="team_size" style={inputStyle}>
                  {labels.teamSizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span style={labelStyle}>{labels.channelLabel}</span>
                <select name="channel" style={inputStyle}>
                  <option value={labels.channelTelegram}>{labels.channelTelegram}</option>
                  <option value={labels.channelPhone}>{labels.channelPhone}</option>
                  <option value={labels.channelEmail}>{labels.channelEmail}</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span style={labelStyle}>{labels.messageLabel}</span>
              <textarea name="message" rows={3} maxLength={2000} placeholder={labels.messagePlaceholder} className="resize-none" style={inputStyle} />
            </label>
            {err && (
              <div className="rounded-lg px-3 py-2.5 text-[13px]" role="alert" style={{ background: "var(--color-danger-container)", color: "var(--color-danger)" }}>
                {err}
              </div>
            )}
            <div className="mt-2 flex items-center justify-end gap-3">
              <button type="button" onClick={close} className="btn-ghost" style={{ minHeight: 40 }}>
                {labels.closeLabel}
              </button>
              <button type="submit" disabled={isPending} className="btn-primary" style={{ minHeight: 40, opacity: isPending ? 0.7 : 1 }}>
                {isPending ? labels.submitting : labels.submit}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
