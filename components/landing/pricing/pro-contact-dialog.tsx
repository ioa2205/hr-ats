"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
      <button
        type="button"
        onClick={open}
        className="block w-full text-center"
        style={{
          padding: "14px 18px",
          background: "var(--ink)",
          color: "var(--paper-3)",
          fontFamily: "var(--font-manrope),sans-serif",
          fontWeight: 600,
          fontSize: 14,
          letterSpacing: "-0.005em",
          border: 0,
        }}
      >
        {labels.triggerLabel}
      </button>
      <dialog
        ref={dialogRef}
        onClick={onBackdropClick}
        aria-labelledby="tezhr-pro-dialog-title"
        className="m-0 w-full max-w-[min(640px,96vw)] border-2 border-[var(--ink)] bg-[var(--paper-3)] p-0 text-[var(--ink)] backdrop:bg-[rgba(20,18,16,0.55)]"
        style={{ inset: 0 }}
      >
        <div
          className="flex items-center justify-between border-b border-[var(--ink)] px-6 py-4"
          style={{ background: "var(--ink)", color: "var(--paper-3)" }}
        >
          <div className="flex items-baseline gap-3">
            <span
              className="mono text-[10px] tracking-[0.22em]"
              style={{ color: "var(--saffron)" }}
            >
              TEZHR · PRO
            </span>
            <span
              id="tezhr-pro-dialog-title"
              className="serif text-[22px] italic tracking-[-0.015em]"
            >
              {labels.heading}
            </span>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={labels.closeLabel}
            className="grid h-9 w-9 place-items-center border border-[var(--paper-3)] text-[16px] leading-none"
          >
            ×
          </button>
        </div>
        {ok ? (
          <div className="flex flex-col items-start gap-4 p-8">
            <h3
              className="serif m-0 text-[32px] leading-[1.15] tracking-[-0.02em]"
              style={{ color: "var(--persimmon-2)" }}
            >
              {labels.successHeading}
            </h3>
            <p
              className="serif m-0 max-w-[440px] text-[17px] italic leading-[1.55]"
              style={{ color: "var(--ink-2)" }}
            >
              {labels.successBody}
            </p>
            <button
              type="button"
              onClick={close}
              className="btn-ghost"
            >
              {labels.closeLabel}
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4 p-7">
            <label className="flex flex-col gap-1">
              <span
                className="mono text-[10px] tracking-[0.14em]"
                style={{ color: "var(--ink-3)" }}
              >
                {labels.nameLabel}
              </span>
              <input
                ref={firstFieldRef}
                name="name"
                required
                minLength={2}
                maxLength={120}
                className="border px-3 py-2.5 text-[15px]"
                style={{ borderColor: "var(--ink)", background: "var(--paper)" }}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span
                  className="mono text-[10px] tracking-[0.14em]"
                  style={{ color: "var(--ink-3)" }}
                >
                  {labels.emailLabel}
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={200}
                  className="border px-3 py-2.5 text-[15px]"
                  style={{ borderColor: "var(--ink)", background: "var(--paper)" }}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span
                  className="mono text-[10px] tracking-[0.14em]"
                  style={{ color: "var(--ink-3)" }}
                >
                  {labels.companyLabel}
                </span>
                <input
                  name="company"
                  maxLength={200}
                  className="border px-3 py-2.5 text-[15px]"
                  style={{ borderColor: "var(--ink)", background: "var(--paper)" }}
                />
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span
                  className="mono text-[10px] tracking-[0.14em]"
                  style={{ color: "var(--ink-3)" }}
                >
                  {labels.teamSizeLabel}
                </span>
                <select
                  name="team_size"
                  className="border px-3 py-2.5 text-[15px]"
                  style={{ borderColor: "var(--ink)", background: "var(--paper)" }}
                >
                  {labels.teamSizes.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span
                  className="mono text-[10px] tracking-[0.14em]"
                  style={{ color: "var(--ink-3)" }}
                >
                  {labels.channelLabel}
                </span>
                <select
                  name="channel"
                  className="border px-3 py-2.5 text-[15px]"
                  style={{ borderColor: "var(--ink)", background: "var(--paper)" }}
                >
                  <option value={labels.channelTelegram}>{labels.channelTelegram}</option>
                  <option value={labels.channelPhone}>{labels.channelPhone}</option>
                  <option value={labels.channelEmail}>{labels.channelEmail}</option>
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span
                className="mono text-[10px] tracking-[0.14em]"
                style={{ color: "var(--ink-3)" }}
              >
                {labels.messageLabel}
              </span>
              <textarea
                name="message"
                rows={3}
                maxLength={2000}
                placeholder={labels.messagePlaceholder}
                className="resize-none border px-3 py-2.5 text-[15px]"
                style={{ borderColor: "var(--ink)", background: "var(--paper)" }}
              />
            </label>
            {err && (
              <div
                className="mono text-[12px] tracking-[0.06em]"
                style={{ color: "var(--persimmon-2)" }}
                role="alert"
              >
                {err}
              </div>
            )}
            <div className="mt-2 flex items-center justify-end gap-3">
              <button type="button" onClick={close} className="btn-ghost">
                {labels.closeLabel}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-primary"
                style={{ opacity: isPending ? 0.7 : 1 }}
              >
                {isPending ? labels.submitting : labels.submit}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
