"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import {
  Avatar,
  Panel,
  PanelHeader,
  PanelTitle,
  Pill,
  Seg,
  TezButton,
} from "@/components/hr/design";
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
    <>
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
      {props.isOwner && (
        <DangerZone companyName={props.company.name} />
      )}
      {!props.canEdit && (
        <p className="text-ink-5 mt-4 text-[11.5px]">
          {t("hr.settings.company.not_editable")}
        </p>
      )}
    </>
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
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const savedName = useRef(company.name);

  const save = useCallback(
    async (patch: { name?: string; default_locale?: Locale }) => {
      setStatus("saving");
      const res = await updateCompanyIdentity(patch);
      if (res.ok) {
        if (patch.name) savedName.current = patch.name;
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 1400);
        refresh();
      } else {
        setStatus("error");
      }
    },
    [refresh],
  );

  const onLogoPick = useCallback(
    async (file: File) => {
      setLogoError(null);
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        setLogoError(t("hr.settings.company.logo_bad_type"));
        return;
      }
      if (file.size > 1024 * 1024) {
        setLogoError(t("hr.settings.company.logo_too_large"));
        return;
      }
      setUploading(true);
      try {
        const resized = await resizeTo256Png(file);
        const fd = new FormData();
        fd.append("logo", resized, "logo.png");
        const res = await fetch("/api/hr/company/logo", { method: "POST", body: fd });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { logo_url: string };
        setLogoUrl(data.logo_url);
        refresh();
      } catch {
        setLogoError(t("hr.settings.company.logo_upload_failed"));
      } finally {
        setUploading(false);
      }
    },
    [t, setLogoUrl, refresh],
  );

  const onLogoRemove = async () => {
    try {
      const res = await fetch("/api/hr/company/logo", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setLogoUrl(null);
      refresh();
    } catch {
      setLogoError(t("hr.settings.company.logo_upload_failed"));
    }
  };

  return (
    <Panel className="mb-4">
      <PanelHeader>
        <PanelTitle>{t("hr.settings.company.identity_panel")}</PanelTitle>
      </PanelHeader>
      <div className="space-y-4 p-[18px]">
        <div className="flex items-center gap-4">
          <Avatar name={name || "Workspace"} url={logoUrl ?? undefined} size="xl" />
          {canEdit && (
            <div className="flex flex-col gap-1.5">
              <input
                ref={fileInput}
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onLogoPick(f);
                }}
              />
              <TezButton
                size="sm"
                variant="secondary"
                leadingIcon={<Upload className="h-3 w-3" />}
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                {t("hr.settings.company.logo_change")}
              </TezButton>
              {logoUrl && (
                <TezButton size="sm" variant="ghost" onClick={onLogoRemove}>
                  {t("hr.settings.company.logo_remove")}
                </TezButton>
              )}
              <p className="text-ink-5 max-w-[240px] text-[10.5px] leading-[1.45]">
                {t("hr.settings.company.logo_hint")}
              </p>
              {logoError && (
                <p className="text-persimmon-2 text-[11px]">{logoError}</p>
              )}
            </div>
          )}
        </div>

        <div className="border-rule border-t pt-4">
          <label className="text-ink-2 text-[11.5px] font-semibold">
            {t("hr.settings.company.name_label")}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => {
              if (name.trim().length >= 2 && name.trim() !== savedName.current && canEdit) {
                void save({ name: name.trim() });
              }
            }}
            disabled={!canEdit}
            maxLength={100}
            className="border-rule-2 bg-paper text-ink mt-1 w-full max-w-[420px] rounded-[4px] border px-3 py-2 text-[13px] disabled:opacity-70"
          />
        </div>

        <div>
          <label className="text-ink-2 text-[11.5px] font-semibold">
            {t("hr.settings.company.default_locale_label")}
          </label>
          <div className="mt-1.5">
            <Seg
              value={locale}
              options={[
                { value: "ru", label: "Русский" },
                { value: "uz", label: "O‘zbekcha" },
                { value: "en", label: "English" },
              ]}
              onChange={(v) => {
                if (!canEdit) return;
                setLocale(v as Locale);
                void save({ default_locale: v as Locale });
              }}
            />
          </div>
        </div>

        <StatusLine status={status} />
      </div>
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
    <Panel className="mb-4">
      <PanelHeader>
        <PanelTitle>{t("hr.settings.company.slug_panel")}</PanelTitle>
        <Pill tone="outline">{t("hr.settings.company.slug_preview_badge")}</Pill>
      </PanelHeader>
      <div className="p-[18px]">
        <div className="flex items-center gap-0 max-w-[420px]">
          <span
            className="border-rule-2 bg-bone-2 text-ink-4 rounded-l-[4px] border border-r-0 px-2.5 py-2 text-[12.5px]"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            tezhr.uz/
          </span>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase())}
            disabled={!canEdit}
            maxLength={32}
            className="border-rule-2 bg-paper text-ink flex-1 rounded-r-[4px] border px-2.5 py-2 text-[13px] disabled:opacity-70"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          />
        </div>
        <p className="text-ink-5 mt-2 text-[11.5px]">
          {t("hr.settings.company.slug_hint")}
        </p>
        {error && <p className="text-persimmon-2 mt-1 text-[11.5px]">{error}</p>}
        {canEdit && (
          <TezButton
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={submit}
            disabled={value === saved || status === "saving"}
          >
            {t("hr.settings.company.slug_save")}
          </TezButton>
        )}
      </div>
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
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!target) return;
    const targetRow = eligible.find((a) => a.id === target);
    if (!targetRow) return;
    if (confirm.trim().toLowerCase() !== targetRow.email.toLowerCase()) {
      setError(t("hr.settings.company.ownership_confirm_hint"));
      return;
    }
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
    <Panel className="mb-4">
      <PanelHeader>
        <PanelTitle>{t("hr.settings.company.ownership_panel")}</PanelTitle>
      </PanelHeader>
      <div className="p-[18px]">
        <ul className="flex flex-col divide-y divide-rule">
          {owners.map((o) => (
            <li key={o.id} className="flex items-center justify-between py-2">
              <div>
                <div className="text-ink text-[13px] font-semibold">{o.name}</div>
                <div
                  className="text-ink-4 text-[11.5px]"
                  style={{ fontFamily: "var(--font-tez-mono)" }}
                >
                  {o.email}
                </div>
              </div>
              <Pill tone="persimmon">{t("team.role_owner")}</Pill>
            </li>
          ))}
        </ul>
        {isOwner && (
          <>
            <TezButton
              size="sm"
              variant="secondary"
              className="mt-3"
              onClick={() => setOpen(true)}
              disabled={eligible.length === 0}
            >
              {t("hr.settings.company.ownership_transfer")}
            </TezButton>
            {eligible.length === 0 && (
              <p className="text-ink-5 mt-2 text-[11.5px]">
                {t("hr.settings.company.ownership_no_admins")}
              </p>
            )}
          </>
        )}
      </div>

      {open && (
        <DialogShell onClose={() => setOpen(false)}>
          <div className="text-ink text-[16px] font-semibold">
            {t("hr.settings.company.ownership_dialog_title")}
          </div>
          <p className="text-ink-4 mt-2 text-[12.5px] leading-[1.5]">
            {t("hr.settings.company.ownership_dialog_body")}
          </p>
          <div className="mt-3">
            <label className="text-ink-2 text-[11.5px] font-semibold">
              {t("hr.settings.company.ownership_target_label")}
            </label>
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="border-rule-2 bg-paper text-ink mt-1 w-full rounded-[4px] border px-2.5 py-2 text-[13px]"
            >
              {eligible.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {a.email}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <label className="text-ink-2 text-[11.5px] font-semibold">
              {t("hr.settings.company.ownership_confirm_label")}
            </label>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={eligible.find((a) => a.id === target)?.email ?? ""}
              className="border-rule-2 bg-paper text-ink mt-1 w-full rounded-[4px] border px-3 py-2 text-[12.5px]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
            />
          </div>
          {error && <p className="text-persimmon-2 mt-2 text-[11.5px]">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <TezButton
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={status === "sending"}
            >
              {t("common.cancel")}
            </TezButton>
            <TezButton
              size="sm"
              variant="accent"
              onClick={submit}
              disabled={status === "sending"}
            >
              {t("hr.settings.company.ownership_submit")}
            </TezButton>
          </div>
        </DialogShell>
      )}
    </Panel>
  );
}

// ─── Danger zone ─────────────────────────────────────────────────────

function DangerZone({ companyName }: { companyName: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setStatus("deleting");
    const res = await deleteWorkspace({ confirmation: value });
    if (!res.ok) {
      setStatus("error");
      setError(t("hr.settings.company.delete_error"));
    }
  };

  return (
    <Panel className="border-[color:var(--color-tez-red)]/30 mb-4">
      <PanelHeader>
        <PanelTitle>
          <span className="text-tez-red">{t("hr.settings.company.danger_panel")}</span>
        </PanelTitle>
      </PanelHeader>
      <div className="p-[18px]">
        <TezButton
          size="sm"
          variant="secondary"
          className="border-[color:var(--color-tez-red)]/40 text-[color:var(--color-tez-red)]"
          onClick={() => {
            setValue("");
            setError(null);
            setOpen(true);
          }}
        >
          {t("hr.settings.company.delete_button")}
        </TezButton>
      </div>
      {open && (
        <DialogShell onClose={() => setOpen(false)}>
          <div className="text-ink text-[16px] font-semibold">
            {t("hr.settings.company.delete_dialog_title")}
          </div>
          <p className="text-ink-4 mt-2 text-[12.5px] leading-[1.5]">
            {t("hr.settings.company.delete_dialog_body")}
          </p>
          <p className="text-ink-3 mt-3 text-[12px]">
            {t("hr.settings.company.delete_type_hint", { name: companyName })}
          </p>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={companyName}
            className="border-rule-2 bg-paper text-ink mt-1.5 w-full rounded-[4px] border px-3 py-2 text-[13px]"
          />
          {error && <p className="text-persimmon-2 mt-2 text-[11.5px]">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <TezButton
              size="sm"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={status === "deleting"}
            >
              {t("common.cancel")}
            </TezButton>
            <TezButton
              size="sm"
              variant="accent"
              onClick={submit}
              disabled={
                status === "deleting" ||
                value.trim().toLowerCase() !== companyName.toLowerCase()
              }
            >
              {status === "deleting"
                ? t("hr.settings.company.delete_confirming")
                : t("hr.settings.company.delete_confirm")}
            </TezButton>
          </div>
        </DialogShell>
      )}
    </Panel>
  );
}

function StatusLine({ status }: { status: "idle" | "saving" | "saved" | "error" }) {
  const { t } = useTranslation();
  if (status === "idle") return <div className="h-3" />;
  return (
    <div className="h-3 text-[11.5px]">
      {status === "saving" ? (
        <span className="text-ink-5">{t("common.saving")}</span>
      ) : status === "saved" ? (
        <span className="text-tez-green font-medium">
          ✓ {t("hr.settings.company.saved")}
        </span>
      ) : (
        <span className="text-tez-red">{t("hr.settings.company.save_error")}</span>
      )}
    </div>
  );
}

function DialogShell({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="border-rule bg-paper shadow-tez-3 w-full max-w-[480px] rounded-[6px] border p-5">
        {children}
      </div>
    </div>
  );
}

async function resizeTo256Png(file: File): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("image_load"));
    im.src = dataUrl;
  });
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  const scale = Math.max(size / img.width, size / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  const dx = (size - w) / 2;
  const dy = (size - h) / 2;
  ctx.drawImage(img, dx, dy, w, h);
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png"),
  );
  if (!blob) throw new Error("encode_failed");
  return blob;
}
