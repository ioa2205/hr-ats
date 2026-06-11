"use client";

import { useState } from "react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Radio,
  RadioGroup,
  SuccessState,
  Textarea,
} from "@/components/ui";
import { ButtonSpinner } from "@/components/hr/settings/settings-ui";
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
      <Button
        variant={emphasized ? "accent" : "secondary"}
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
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          {status === "sent" ? (
            <>
              <SuccessState
                title={t("hr.settings.billing.upgrade.dialog_sent_title")}
                description={t("hr.settings.billing.upgrade.dialog_sent_body")}
                compact
              />
              <DialogFooter>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("hr.settings.billing.upgrade.dialog_title")}</DialogTitle>
                <DialogDescription>
                  {t("hr.settings.billing.upgrade.dialog_body")}
                </DialogDescription>
              </DialogHeader>
              {status === "error" && (
                <p className="px-6 pt-3 text-[12px] text-[var(--color-danger)]" role="alert">
                  {t("hr.settings.billing.upgrade.dialog_error")}
                </p>
              )}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={status === "sending"}>
                  {t("common.cancel")}
                </Button>
                <Button variant="primary" onClick={submit} disabled={status === "sending"}>
                  {status === "sending" && <ButtonSpinner />}
                  {status === "sending"
                    ? t("hr.settings.billing.upgrade.dialog_submitting")
                    : t("hr.settings.billing.upgrade.dialog_submit")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
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
      <Button
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
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[460px]">
          {status === "sent" ? (
            <>
              <SuccessState title={t("hr.settings.billing.cancel.sent")} compact />
              <DialogFooter>
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  {t("common.save")}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{t("hr.settings.billing.cancel.dialog_title")}</DialogTitle>
                <DialogDescription>
                  {t("hr.settings.billing.cancel.dialog_body")}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4 px-6 pt-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-[var(--color-text)]">
                    {t("hr.settings.billing.cancel.reason_label")}
                  </span>
                  <RadioGroup
                    aria-label={t("hr.settings.billing.cancel.reason_label")}
                    value={reason}
                    onValueChange={(v) => setReason(v as CancelReason)}
                  >
                    {CANCEL_REASONS.map((r) => (
                      <Radio key={r.value} value={r.value} label={t(r.labelKey)} />
                    ))}
                  </RadioGroup>
                </div>
                <Textarea
                  label={t("hr.settings.billing.cancel.notes_label")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("hr.settings.billing.cancel.notes_placeholder")}
                  rows={3}
                />
                {status === "error" && (
                  <p className="text-[12px] text-[var(--color-danger)]" role="alert">
                    {t("hr.settings.billing.cancel.error")}
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={status === "sending"}>
                  {t("common.cancel")}
                </Button>
                <Button variant="primary" onClick={submit} disabled={status === "sending"}>
                  {status === "sending" && <ButtonSpinner />}
                  {status === "sending"
                    ? t("hr.settings.billing.cancel.submitting")
                    : t("hr.settings.billing.cancel.submit")}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
