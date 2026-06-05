"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TezButton } from "@/components/hr/design";
import { useTranslation } from "@/lib/i18n/provider";
import { requestCancel, requestUpgrade } from "@/lib/actions/billing";
import type { TranslationKey } from "@/lib/i18n/types";

type CancelReason = "too_expensive" | "missing_feature" | "no_need" | "other";

const CANCEL_REASONS: { value: CancelReason; labelKey: TranslationKey }[] = [
  { value: "too_expensive", labelKey: "hr.settings.billing.cancel.reason_too_expensive" },
  { value: "missing_feature", labelKey: "hr.settings.billing.cancel.reason_missing_feature" },
  { value: "no_need", labelKey: "hr.settings.billing.cancel.reason_no_need" },
  { value: "other", labelKey: "hr.settings.billing.cancel.reason_other" },
];

export function UpgradeButton({
  emphasized = true,
  hasPendingRequest = false,
  autoOpen = false,
}: {
  emphasized?: boolean;
  hasPendingRequest?: boolean;
  autoOpen?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(autoOpen);
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    hasPendingRequest ? "sent" : "idle",
  );

  const submit = async () => {
    setStatus("sending");
    const res = await requestUpgrade({
      source: autoOpen ? "landing_intent" : "billing_settings",
    });
    if (res.ok) {
      if (res.status === "already_pro") {
        window.location.reload();
        return;
      }
      setStatus("sent");
      return;
    }
    setStatus("error");
  };

  return (
    <>
      <TezButton
        variant={emphasized ? "accent" : "secondary"}
        size="md"
        onClick={() => {
          setStatus(hasPendingRequest ? "sent" : "idle");
          setOpen(true);
        }}
        disabled={status === "sending"}
      >
        {status === "sending"
          ? t("hr.settings.billing.upgrade.dialog_submitting")
          : hasPendingRequest || status === "sent"
            ? t("hr.settings.billing.upgrade.dialog_sent_title")
            : t("hr.settings.billing.cta.upgrade")}
      </TezButton>
      {open && (
        <DialogShell onClose={() => setOpen(false)}>
          {status === "sent" ? (
            <div className="text-center">
              <div className="text-ink text-[14px] font-semibold">
                {t("hr.settings.billing.upgrade.dialog_sent_title")}
              </div>
              <p className="text-ink-4 mt-2 text-[12.5px] leading-[1.5]">
                {t("hr.settings.billing.upgrade.dialog_sent_body")}
              </p>
              <TezButton
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setOpen(false)}
              >
                {t("common.save")}
              </TezButton>
            </div>
          ) : (
            <>
              <div className="text-ink text-[16px] font-semibold tracking-[-0.01em]">
                {t("hr.settings.billing.upgrade.dialog_title")}
              </div>
              <p className="text-ink-4 mt-2 text-[12.5px] leading-[1.5]">
                {t("hr.settings.billing.upgrade.dialog_body")}
              </p>
              {status === "error" && (
                <p className="text-tez-red mt-2 text-[11.5px]">
                  {t("hr.settings.billing.upgrade.dialog_error")}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <TezButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={status === "sending"}
                >
                  {t("common.cancel")}
                </TezButton>
                <TezButton
                  variant="primary"
                  size="sm"
                  onClick={submit}
                  disabled={status === "sending"}
                >
                  {status === "sending"
                    ? t("hr.settings.billing.upgrade.dialog_submitting")
                    : t("hr.settings.billing.upgrade.dialog_submit")}
                </TezButton>
              </div>
            </>
          )}
        </DialogShell>
      )}
    </>
  );
}

export function CancelButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<CancelReason>("too_expensive");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const submit = async () => {
    setStatus("sending");
    const res = await requestCancel({ reason, notes });
    setStatus(res.ok ? "sent" : "error");
  };

  return (
    <>
      <TezButton
        variant="secondary"
        size="sm"
        onClick={() => {
          setStatus("idle");
          setReason("too_expensive");
          setNotes("");
          setOpen(true);
        }}
      >
        {t("hr.settings.billing.cta.cancel")}
      </TezButton>
      {open && (
        <DialogShell onClose={() => setOpen(false)}>
          {status === "sent" ? (
            <div className="text-center">
              <div className="text-ink text-[14px] font-semibold">
                {t("hr.settings.billing.cancel.sent")}
              </div>
              <TezButton
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setOpen(false)}
              >
                {t("common.save")}
              </TezButton>
            </div>
          ) : (
            <>
              <div className="text-ink text-[16px] font-semibold tracking-[-0.01em]">
                {t("hr.settings.billing.cancel.dialog_title")}
              </div>
              <p className="text-ink-4 mt-2 text-[12.5px] leading-[1.5]">
                {t("hr.settings.billing.cancel.dialog_body")}
              </p>

              <div className="mt-3">
                <label className="text-ink-2 text-[11.5px] font-semibold">
                  {t("hr.settings.billing.cancel.reason_label")}
                </label>
                <div className="mt-1.5 flex flex-col gap-1">
                  {CANCEL_REASONS.map((r) => (
                    <label
                      key={r.value}
                      className={cn(
                        "hover:bg-bone-2 flex cursor-pointer items-center gap-2 rounded-[4px] border px-2.5 py-1.5 text-[12.5px] transition-colors",
                        reason === r.value ? "border-ink bg-bone-2" : "border-rule",
                      )}
                    >
                      <input
                        type="radio"
                        name="cancel-reason"
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                        className="accent-ink"
                      />
                      {t(r.labelKey)}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <label className="text-ink-2 text-[11.5px] font-semibold">
                  {t("hr.settings.billing.cancel.notes_label")}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("hr.settings.billing.cancel.notes_placeholder")}
                  rows={3}
                  className="border-rule-2 bg-paper mt-1.5 w-full resize-none rounded-[4px] border px-2.5 py-2 text-[12.5px]"
                />
              </div>

              {status === "error" && (
                <p className="text-tez-red mt-2 text-[11.5px]">
                  {t("hr.settings.billing.cancel.error")}
                </p>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <TezButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={status === "sending"}
                >
                  {t("common.cancel")}
                </TezButton>
                <TezButton
                  variant="primary"
                  size="sm"
                  onClick={submit}
                  disabled={status === "sending"}
                >
                  {status === "sending"
                    ? t("hr.settings.billing.cancel.submitting")
                    : t("hr.settings.billing.cancel.submit")}
                </TezButton>
              </div>
            </>
          )}
        </DialogShell>
      )}
    </>
  );
}

function DialogShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="bg-ink/40 fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-rule bg-paper shadow-tez-3 w-full max-w-[440px] rounded-[6px] border p-5">
        {children}
      </div>
    </div>
  );
}
