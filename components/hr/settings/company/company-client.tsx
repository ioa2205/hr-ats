"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  SegmentedControl,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";
import {
  AvatarUploader,
  ButtonSpinner,
  ConfirmDialog,
  SaveStatusLine,
} from "@/components/hr/settings/settings-ui";
import { useTranslation } from "@/lib/i18n/provider";
import type { Locale, TranslationKey } from "@/lib/i18n/types";
import {
  deleteWorkspace,
  transferOwnership,
  updateCompanyIdentity,
  updateCompanySlug,
} from "@/lib/actions/company";

interface CompanyClientProps {
  isOwner: boolean;
  canEdit: boolean;
  company: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    defaultLocale: Locale;
  };
  admins: { id: string; name: string; email: string }[];
  owners: { id: string; name: string; email: string }[];
  selfId: string;
}

export function CompanyClient(props: CompanyClientProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState(props.company.logoUrl);

  return (
    <div className="flex flex-col gap-4">
      <IdentityPanel
        {...props}
        logoUrl={logoUrl}
        setLogoUrl={setLogoUrl}
        refresh={() => router.refresh()}
      />
      <SlugPanel
        initial={props.company.slug}
        canEdit={props.isOwner}
        refresh={() => router.refresh()}
      />
      <OwnershipPanel
        isOwner={props.isOwner}
        owners={props.owners}
        admins={props.admins}
        selfId={props.selfId}
        refresh={() => router.refresh()}
      />
      {props.isOwner && <DangerZone companyName={props.company.name} />}
      {!props.canEdit && (
        <p className="text-[11.5px] text-[var(--color-text-subtle)]">
          {t("hr.settings.company.not_editable")}
        </p>
      )}
    </div>
  );
}

// ─── Identity Panel ──────────────────────────────────────────────────

function IdentityPanel({
  canEdit,
  company,
  logoUrl,
  setLogoUrl,
  refresh,
}: CompanyClientProps & {
  logoUrl: string | null;
  setLogoUrl: (v: string | null) => void;
  refresh: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(company.name);
  const [locale, setLocale] = useState<Locale>(company.defaultLocale);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savedName = company.name;

  const save = useCallback(
    async (patch: { name?: string; default_locale?: Locale }) => {
      setStatus("saving");
      const res = await updateCompanyIdentity(patch);
      if (res.ok) {
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1400);
        refresh();
      } else {
        setStatus("error");
      }
    },
    [refresh],
  );

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t("hr.settings.company.identity_panel")}</PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-4">
        <AvatarUploader
          name={name || "Workspace"}
          url={logoUrl}
          onUrl={setLogoUrl}
          canEdit={canEdit}
          endpoint="/api/hr/company/logo"
          fieldName="logo"
          responseKey="logo_url"
          maxBytes={1024 * 1024}
          labels={{
            change: t("hr.settings.company.logo_change"),
            remove: t("hr.settings.company.logo_remove"),
            hint: t("hr.settings.company.logo_hint"),
            badType: t("hr.settings.company.logo_bad_type"),
            tooLarge: t("hr.settings.company.logo_too_large"),
            uploadFailed: t("hr.settings.company.logo_upload_failed"),
          }}
        />

        <div className="border-t border-[var(--color-line)] pt-4">
          <Input
            label={t("hr.settings.company.name_label")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim().length >= 2 && name.trim() !== savedName && canEdit) {
                void save({ name: name.trim() });
              }
            }}
            disabled={!canEdit}
            maxLength={100}
            className="max-w-[420px]"
          />
        </div>

        <div>
          <div className="mb-1.5 text-sm font-medium text-[var(--color-text)]">
            {t("hr.settings.company.default_locale_label")}
          </div>
          {canEdit ? (
            <SegmentedControl
              aria-label={t("hr.settings.company.default_locale_label")}
              value={locale}
              options={[
                { value: "ru", label: "Русский" },
                { value: "uz", label: "O‘zbekcha" },
                { value: "en", label: "English" },
              ]}
              onChange={(v) => {
                setLocale(v as Locale);
                void save({ default_locale: v as Locale });
              }}
            />
          ) : (
            <Badge tone="neutral">{locale.toUpperCase()}</Badge>
          )}
        </div>

        <SaveStatusLine
          status={status}
          savedLabel={t("hr.settings.company.saved")}
          errorLabel={t("hr.settings.company.save_error")}
        />
      </PanelBody>
    </Panel>
  );
}

// ─── Slug Panel ──────────────────────────────────────────────────────

function SlugPanel({
  initial,
  canEdit,
  refresh,
}: {
  initial: string;
  canEdit: boolean;
  refresh: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!canEdit) return;
    if (value === saved) return;
    setError(null);
    setStatus("saving");
    const res = await updateCompanySlug({ slug: value.trim().toLowerCase() });
    if (res.ok) {
      setSaved(value);
      setStatus("idle");
      refresh();
    } else {
      setStatus("error");
      const keyMap: Record<string, TranslationKey> = {
        too_short: "hr.settings.company.slug_error.too_short",
        too_long: "hr.settings.company.slug_error.too_long",
        bad_chars: "hr.settings.company.slug_error.bad_chars",
        reserved: "hr.settings.company.slug_error.reserved",
        taken: "hr.settings.company.slug_error.taken",
      };
      const key = keyMap[res.error] ?? "hr.settings.company.slug_error.generic";
      setError(t(key));
    }
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t("hr.settings.company.slug_panel")}</PanelTitle>
        <Badge tone="neutral">{t("hr.settings.company.slug_preview_badge")}</Badge>
      </PanelHeader>
      <PanelBody>
        <div className="flex max-w-[440px] items-stretch">
          <span className="data-mono inline-flex items-center rounded-l-[var(--radius-md)] border border-r-0 border-[var(--color-line-strong)] bg-[var(--color-surface-subtle)] px-2.5 text-[12.5px] text-[var(--color-text-muted)]">
            tezhr.uz/
          </span>
          <input
            aria-label={t("hr.settings.company.slug_panel")}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase())}
            disabled={!canEdit}
            maxLength={32}
            className="data-mono h-11 min-w-0 flex-1 rounded-r-[var(--radius-md)] border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 text-[13px] text-[var(--color-text)] outline-none focus:border-[var(--color-focus)] disabled:opacity-70"
          />
        </div>
        <p className="mt-2 text-[11.5px] text-[var(--color-text-subtle)]">
          {t("hr.settings.company.slug_hint")}
        </p>
        {error && <p className="mt-1 text-[11.5px] text-[var(--color-danger)]">{error}</p>}
        {canEdit && (
          <Button
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={submit}
            disabled={value === saved || status === "saving"}
          >
            {status === "saving" && <ButtonSpinner />}
            {t("hr.settings.company.slug_save")}
          </Button>
        )}
      </PanelBody>
    </Panel>
  );
}

// ─── Ownership Panel ─────────────────────────────────────────────────

function OwnershipPanel({
  isOwner,
  owners,
  admins,
  selfId,
  refresh,
}: {
  isOwner: boolean;
  owners: { id: string; name: string; email: string }[];
  admins: { id: string; name: string; email: string }[];
  selfId: string;
  refresh: () => void;
}) {
  const { t } = useTranslation();
  const eligible = admins.filter((a) => a.id !== selfId);
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState<string>(eligible[0]?.id ?? "");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const targetRow = eligible.find((a) => a.id === target);

  const submit = async () => {
    if (!target) return;
    setStatus("sending");
    setError(null);
    const res = await transferOwnership({ newOwnerId: target });
    if (res.ok) {
      setOpen(false);
      refresh();
    } else {
      setStatus("error");
      setError(t("hr.settings.company.ownership_error"));
    }
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>{t("hr.settings.company.ownership_panel")}</PanelTitle>
      </PanelHeader>
      <PanelBody>
        <ul className="flex flex-col divide-y divide-[var(--color-line)]">
          {owners.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold text-[var(--color-text)]">
                  {o.name}
                </div>
                <div className="data-mono truncate text-[11.5px] text-[var(--color-text-muted)]">
                  {o.email}
                </div>
              </div>
              <Badge tone="primary">{t("team.role_owner")}</Badge>
            </li>
          ))}
        </ul>
        {isOwner && (
          <>
            <Button
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => {
                setStatus("idle");
                setError(null);
                setTarget(eligible[0]?.id ?? "");
                setOpen(true);
              }}
              disabled={eligible.length === 0}
            >
              {t("hr.settings.company.ownership_transfer")}
            </Button>
            {eligible.length === 0 && (
              <p className="mt-2 text-[11.5px] text-[var(--color-text-subtle)]">
                {t("hr.settings.company.ownership_no_admins")}
              </p>
            )}
          </>
        )}
      </PanelBody>

      <ConfirmDialog
        open={open}
        onOpenChange={(v) => setOpen(v)}
        title={t("hr.settings.company.ownership_dialog_title")}
        description={t("hr.settings.company.ownership_dialog_body")}
        confirmLabel={t("hr.settings.company.ownership_submit")}
        cancelLabel={t("common.cancel")}
        onConfirm={submit}
        tone="primary"
        busy={status === "sending"}
        error={error}
        typeToConfirm={targetRow?.email ?? ""}
        typeToConfirmLabel={t("hr.settings.company.ownership_confirm_label")}
        typeToConfirmHint={t("hr.settings.company.ownership_confirm_label")}
      >
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="ownership-target"
            className="text-sm font-medium text-[var(--color-text)]"
          >
            {t("hr.settings.company.ownership_target_label")}
          </label>
          <Select value={target} onValueChange={setTarget}>
            <SelectTrigger id="ownership-target" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {eligible.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name} · {a.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ConfirmDialog>
    </Panel>
  );
}

// ─── Danger zone ─────────────────────────────────────────────────────

function DangerZone({ companyName }: { companyName: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setStatus("deleting");
    const res = await deleteWorkspace({ confirmation: companyName });
    if (!res.ok) {
      setStatus("error");
      setError(t("hr.settings.company.delete_error"));
    }
  };

  return (
    <Panel className="border-[color-mix(in_srgb,var(--color-danger)_40%,var(--color-line))]">
      <PanelHeader>
        <PanelTitle className="text-[var(--color-danger)]">
          {t("hr.settings.company.danger_panel")}
        </PanelTitle>
      </PanelHeader>
      <PanelBody>
        <Button
          size="sm"
          variant="secondary"
          className="border-[color-mix(in_srgb,var(--color-danger)_50%,var(--color-line))] text-[var(--color-danger)]"
          onClick={() => {
            setStatus("idle");
            setError(null);
            setOpen(true);
          }}
        >
          {t("hr.settings.company.delete_button")}
        </Button>
      </PanelBody>

      <ConfirmDialog
        open={open}
        onOpenChange={(v) => setOpen(v)}
        title={t("hr.settings.company.delete_dialog_title")}
        description={t("hr.settings.company.delete_dialog_body")}
        confirmLabel={t("hr.settings.company.delete_confirm")}
        confirmingLabel={t("hr.settings.company.delete_confirming")}
        cancelLabel={t("common.cancel")}
        onConfirm={submit}
        busy={status === "deleting"}
        error={error}
        typeToConfirm={companyName}
        typeToConfirmLabel={t("hr.settings.company.delete_dialog_title")}
        typeToConfirmHint={t("hr.settings.company.delete_type_hint", { name: companyName })}
      />
    </Panel>
  );
}
