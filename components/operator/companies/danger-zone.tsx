"use client";

import { useState } from "react";
import { AlertTriangle, Gauge, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Textarea,
  useToast,
} from "@/components/ui";
import { useTranslation } from "@/lib/i18n/provider";

interface Props {
  companyId: string;
  companyName: string;
  cvQuotaLimit: number | null;
  jobQuotaLimit: number | null;
  sourcingQuotaLimit: number | null;
  onChanged: () => void;
}

export function DangerZone({
  companyId,
  companyName,
  cvQuotaLimit,
  jobQuotaLimit,
  sourcingQuotaLimit,
  onChanged,
}: Props) {
  const { t } = useTranslation();
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-tez-red)]/40 bg-[var(--color-paper)]">
      <header className="flex items-center gap-2 border-b border-[var(--color-tez-red)]/30 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-tez-red)]">
        <AlertTriangle className="h-3.5 w-3.5" />
        {t("operator.danger.title")}
      </header>
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Gauge className="h-4 w-4 text-[var(--color-ink-4)]" />
          <div className="flex flex-col text-[12px]">
            <span className="font-medium text-[var(--color-ink)]">
              {t("operator.danger.quota_override")}
            </span>
            <span className="text-[var(--color-ink-4)]">
              {t("operator.danger.quota_current", {
                cv: cvQuotaLimit !== null ? String(cvQuotaLimit) : "—",
                job: jobQuotaLimit !== null ? String(jobQuotaLimit) : "—",
                sourcing: sourcingQuotaLimit !== null ? String(sourcingQuotaLimit) : "—",
              })}
            </span>
          </div>
        </div>
        <Button size="sm" variant="secondary" onClick={() => setOverrideOpen(true)}>
          {t("operator.danger.quota_button")}
        </Button>
      </div>
      <div className="flex flex-col gap-2 border-t border-[var(--color-rule)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Trash2 className="h-4 w-4 text-[var(--color-tez-red)]" />
          <div className="flex flex-col text-[12px]">
            <span className="font-medium text-[var(--color-ink)]">
              {t("operator.danger.delete_title")}
            </span>
            <span className="text-[var(--color-ink-4)]">{t("operator.danger.delete_help")}</span>
          </div>
        </div>
        <Button size="sm" variant="danger" onClick={() => setDeleteOpen(true)}>
          {t("operator.danger.delete_button")}
        </Button>
      </div>

      <OverrideDialog
        open={overrideOpen}
        onOpenChange={setOverrideOpen}
        companyId={companyId}
        currentCv={cvQuotaLimit}
        currentJob={jobQuotaLimit}
        currentSourcing={sourcingQuotaLimit}
        onDone={() => {
          setOverrideOpen(false);
          onChanged();
        }}
      />
      <DeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        companyId={companyId}
        companyName={companyName}
        onDone={() => {
          setDeleteOpen(false);
          onChanged();
        }}
      />
    </section>
  );
}

function OverrideDialog({
  open,
  onOpenChange,
  companyId,
  currentCv,
  currentJob,
  currentSourcing,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  currentCv: number | null;
  currentJob: number | null;
  currentSourcing: number | null;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [cvLimit, setCvLimit] = useState<string>(currentCv?.toString() ?? "");
  const [jobLimit, setJobLimit] = useState<string>(currentJob?.toString() ?? "");
  const [sourcingLimit, setSourcingLimit] = useState<string>(
    currentSourcing?.toString() ?? "",
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (reason.trim().length < 10) return;
    const cv = cvLimit === "" ? undefined : Number(cvLimit);
    const job = jobLimit === "" ? undefined : Number(jobLimit);
    const sourcing = sourcingLimit === "" ? undefined : Number(sourcingLimit);
    if (cv === undefined && job === undefined && sourcing === undefined) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/operator/companies/${companyId}/quota-override`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cvQuotaLimit: cv,
          jobQuotaLimit: job,
          sourcingQuotaLimit: sourcing,
          reason,
        }),
      });
      if (res.ok) {
        toast({ variant: "success", title: t("operator.danger.quota_updated") });
        onDone();
      } else {
        const j = await res.json().catch(() => ({}));
        toast({ variant: "error", title: j?.error ?? t("operator.danger.override_failed") });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("operator.danger.dialog_quota_title")}</DialogTitle>
          <DialogDescription>{t("operator.danger.dialog_quota_desc")}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-6 pb-2">
          <Input
            label={t("operator.danger.cv_quota_label")}
            value={cvLimit}
            onChange={(e) => setCvLimit(e.target.value)}
            type="number"
            min={0}
          />
          <Input
            label={t("operator.danger.job_quota_label")}
            value={jobLimit}
            onChange={(e) => setJobLimit(e.target.value)}
            type="number"
            min={0}
          />
          <Input
            label={t("operator.danger.sourcing_quota_label")}
            value={sourcingLimit}
            onChange={(e) => setSourcingLimit(e.target.value)}
            type="number"
            min={0}
          />
          <Textarea
            label={t("operator.danger.reason_label")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} loading={busy} disabled={reason.trim().length < 10}>
            {t("operator.danger.apply_override")}
          </Button>
        </DialogFooter>
        <p className="px-6 pb-4 text-[10px] text-[var(--color-ink-5)]">
          {t("operator.danger.reversible")}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  companyId,
  companyName,
  onDone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  companyName: string;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = typed === companyName && reason.trim().length >= 10;

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/operator/companies/${companyId}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmName: typed, reason, grace: true }),
      });
      if (res.ok) {
        toast({ variant: "success", title: t("operator.danger.delete_scheduled_toast") });
        onDone();
      } else {
        const j = await res.json().catch(() => ({}));
        toast({ variant: "error", title: j?.error ?? t("operator.danger.delete_failed") });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("operator.danger.dialog_delete_title")}</DialogTitle>
          <DialogDescription>
            {t("operator.danger.dialog_delete_desc", { name: companyName })}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 px-6 pb-2">
          <Input
            label={t("operator.danger.confirm_type_label", { name: companyName })}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            error={
              typed.length > 0 && typed !== companyName
                ? t("operator.danger.name_mismatch")
                : undefined
            }
          />
          <Textarea
            label={t("operator.danger.reason_label")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button variant="danger" onClick={submit} loading={busy} disabled={!canSubmit}>
            {t("operator.danger.schedule_delete")}
          </Button>
        </DialogFooter>
        <p className="px-6 pb-4 text-[10px] text-[var(--color-tez-red)]">
          {t("operator.danger.irreversible")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
