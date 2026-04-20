"use client";

import { useCallback, useRef, useState, useTransition } from "react";
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
  changeEmail,
  changePassword,
  deleteMyAccount,
  patchProfile,
  signOutEverywhere,
} from "@/lib/actions/profile";

interface ProfileClientProps {
  user: {
    id: string;
    email: string;
    fullName: string;
    locale: Locale;
    avatarUrl: string | null;
    role: "owner" | "admin" | "recruiter";
    isSoleOwner: boolean;
    passwordAuthEnabled: boolean;
    authProviderLabel: string | null;
  };
}

const ROLE_LABEL: Record<ProfileClientProps["user"]["role"], TranslationKey> = {
  owner: "team.role_owner",
  admin: "team.role_admin",
  recruiter: "team.role_recruiter",
};

export function ProfileClient({ user }: ProfileClientProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);

  return (
    <>
      <IdentityCard
        user={user}
        avatarUrl={avatarUrl}
        setAvatarUrl={setAvatarUrl}
        t={t}
        refresh={() => router.refresh()}
        roleLabel={t(ROLE_LABEL[user.role])}
      />

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.profile.name.label")}</PanelTitle>
        </PanelHeader>
        <NameField initial={user.fullName} />
      </Panel>

      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("profile.language_label")}</PanelTitle>
        </PanelHeader>
        <LocaleField initial={user.locale} refresh={() => router.refresh()} />
      </Panel>

      <EmailPanel currentEmail={user.email} />
      <PasswordPanel
        passwordAuthEnabled={user.passwordAuthEnabled}
        authProviderLabel={user.authProviderLabel}
      />
      <SessionsPanel />
      <DangerZone
        email={user.email}
        soleOwner={user.isSoleOwner}
      />
    </>
  );
}

// ─── Identity + avatar ───────────────────────────────────────────────

function IdentityCard({
  user,
  avatarUrl,
  setAvatarUrl,
  t,
  refresh,
  roleLabel,
}: {
  user: ProfileClientProps["user"];
  avatarUrl: string | null;
  setAvatarUrl: (v: string | null) => void;
  t: (k: TranslationKey, vars?: Record<string, string>) => string;
  refresh: () => void;
  roleLabel: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
        setError(t("hr.settings.profile.avatar.bad_type"));
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setError(t("hr.settings.profile.avatar.too_large"));
        return;
      }
      setUploading(true);
      try {
        const resized = await resizeTo256Png(file);
        const fd = new FormData();
        fd.append("avatar", resized, "avatar.png");
        const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { avatar_url: string };
        setAvatarUrl(data.avatar_url);
        refresh();
      } catch {
        setError(t("hr.settings.profile.avatar.upload_failed"));
      } finally {
        setUploading(false);
      }
    },
    [t, setAvatarUrl, refresh],
  );

  const handleRemove = async () => {
    setError(null);
    try {
      const res = await fetch("/api/profile/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setAvatarUrl(null);
      refresh();
    } catch {
      setError(t("hr.settings.profile.avatar.upload_failed"));
    }
  };

  return (
    <Panel className="mb-4">
      <div className="flex items-center gap-4 p-[18px]">
        <div className="relative shrink-0">
          <Avatar name={user.fullName} url={avatarUrl ?? undefined} size="xl" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-ink text-[18px] font-semibold tracking-[-0.015em]">
            {user.fullName}
          </div>
          <div
            className="text-ink-4 mt-0.5 text-[12.5px]"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            {user.email}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Pill tone="neutral">{roleLabel}</Pill>
            <Pill tone="outline">{user.locale.toUpperCase()}</Pill>
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-1.5">
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <TezButton
            size="sm"
            variant="secondary"
            leadingIcon={<Upload className="h-3 w-3" />}
            onClick={() => fileInput.current?.click()}
            disabled={uploading}
          >
            {t("hr.settings.profile.identity.change_avatar")}
          </TezButton>
          {avatarUrl && (
            <TezButton size="sm" variant="ghost" onClick={handleRemove}>
              {t("hr.settings.profile.identity.remove_avatar")}
            </TezButton>
          )}
        </div>
      </div>
      <div className="border-rule border-t px-[18px] py-2">
        <p className="text-ink-5 text-[11px]">
          {t("hr.settings.profile.avatar.hint")}
        </p>
        {error && <p className="text-persimmon-2 mt-1 text-[11.5px]">{error}</p>}
      </div>
    </Panel>
  );
}

// ─── Name autosave ───────────────────────────────────────────────────

function NameField({ initial }: { initial: string }) {
  const { t } = useTranslation();
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const savedRef = useRef(initial);

  const save = useCallback(async (next: string) => {
    if (next === savedRef.current) return;
    if (next.trim().length < 2) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    const res = await patchProfile({ full_name: next.trim() });
    if (res.ok) {
      savedRef.current = next.trim();
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 1400);
    } else {
      setStatus("error");
    }
  }, []);

  return (
    <div className="p-[18px]">
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => void save(e.target.value)}
        maxLength={200}
        className="border-rule-2 bg-paper text-ink w-full max-w-[420px] rounded-[4px] border px-3 py-2 text-[13px]"
      />
      <div className="text-ink-5 mt-1 h-3 text-[11px]">
        {status === "saving"
          ? t("common.saving")
          : status === "saved"
            ? `✓ ${t("profile.saved")}`
            : status === "error"
              ? t("hr.settings.profile.name.too_short")
              : ""}
      </div>
    </div>
  );
}

// ─── Locale Seg ──────────────────────────────────────────────────────

function LocaleField({
  initial,
  refresh,
}: {
  initial: Locale;
  refresh: () => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState<Locale>(initial);
  const [pending, startTransition] = useTransition();

  const onChange = (v: Locale) => {
    setValue(v);
    startTransition(async () => {
      const res = await patchProfile({ locale: v });
      if (res.ok) refresh();
    });
  };

  return (
    <div className="p-[18px]">
      <Seg
        value={value}
        options={[
          { value: "ru", label: "Русский" },
          { value: "uz", label: "O‘zbekcha" },
          { value: "en", label: "English" },
        ]}
        onChange={(v) => onChange(v as Locale)}
      />
      {pending && (
        <div className="text-ink-5 mt-1 text-[11px]">{t("common.saving")}</div>
      )}
    </div>
  );
}

// ─── Email change ────────────────────────────────────────────────────

function EmailPanel({ currentEmail }: { currentEmail: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [next, setNext] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setStatus("sending");
    const res = await changeEmail({ email: next.trim() });
    if (res.ok) {
      setStatus("sent");
    } else {
      setStatus("error");
      setError(
        res.error === "invalid_email"
          ? t("hr.settings.profile.email.invalid")
          : res.error === "unchanged"
            ? t("hr.settings.profile.email.unchanged")
            : t("hr.settings.profile.email.error"),
      );
    }
  };

  return (
    <Panel className="mb-4">
      <PanelHeader>
        <PanelTitle>{t("hr.settings.profile.email.panel_title")}</PanelTitle>
      </PanelHeader>
      <div className="p-[18px]">
        <div className="text-ink-4 mb-1 text-[11.5px] uppercase tracking-[0.06em]">
          {t("hr.settings.profile.email.current_label")}
        </div>
        <div
          className="text-ink text-[13px]"
          style={{ fontFamily: "var(--font-tez-mono)" }}
        >
          {currentEmail}
        </div>

        {!open ? (
          <TezButton
            className="mt-3"
            size="sm"
            variant="secondary"
            onClick={() => setOpen(true)}
          >
            {t("hr.settings.profile.email.change_button")}
          </TezButton>
        ) : status === "sent" ? (
          <p className="text-tez-green mt-3 text-[12.5px] font-medium">
            ✓ {t("hr.settings.profile.email.sent")}
          </p>
        ) : (
          <div className="mt-3 max-w-[420px] space-y-2">
            <label className="text-ink-2 text-[11.5px] font-semibold">
              {t("hr.settings.profile.email.new_label")}
            </label>
            <input
              type="email"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="border-rule-2 bg-paper text-ink w-full rounded-[4px] border px-3 py-2 text-[13px]"
            />
            <p className="text-ink-5 text-[11px]">{t("hr.settings.profile.email.hint")}</p>
            {error && <p className="text-persimmon-2 text-[11.5px]">{error}</p>}
            <div className="flex gap-2 pt-1">
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
                disabled={status === "sending" || next.trim().length < 4}
              >
                {t("hr.settings.profile.email.submit")}
              </TezButton>
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

// ─── Password change ─────────────────────────────────────────────────

function PasswordPanel({
  passwordAuthEnabled,
  authProviderLabel,
}: {
  passwordAuthEnabled: boolean;
  authProviderLabel: string | null;
}) {
  const { t } = useTranslation();
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  if (!passwordAuthEnabled) {
    const key: TranslationKey =
      authProviderLabel === "phone"
        ? "hr.settings.profile.password.disabled_phone"
        : "hr.settings.profile.password.disabled_oauth";
    return (
      <Panel className="mb-4">
        <PanelHeader>
          <PanelTitle>{t("hr.settings.profile.password.panel_title")}</PanelTitle>
        </PanelHeader>
        <div className="p-[18px]">
          <p className="text-ink-4 text-[12.5px]">{t(key)}</p>
        </div>
      </Panel>
    );
  }

  const submit = async () => {
    setError(null);
    setStatus("saving");
    const res = await changePassword({ new: next, confirm });
    if (res.ok) {
      setStatus("saved");
      setNext("");
      setConfirm("");
      setTimeout(() => setStatus("idle"), 2200);
    } else {
      setStatus("error");
      const map: Record<string, TranslationKey> = {
        short: "hr.settings.profile.password.error_short",
        letter: "hr.settings.profile.password.error_no_letter",
        digit: "hr.settings.profile.password.error_no_digit",
        mismatch: "hr.settings.profile.password.error_mismatch",
      };
      const key = map[res.error] ?? "hr.settings.profile.password.error_generic";
      setError(t(key));
    }
  };

  return (
    <Panel className="mb-4">
      <PanelHeader>
        <PanelTitle>{t("hr.settings.profile.password.panel_title")}</PanelTitle>
      </PanelHeader>
      <div className="grid max-w-[440px] gap-2 p-[18px]">
        <div>
          <label className="text-ink-2 text-[11.5px] font-semibold">
            {t("hr.settings.profile.password.new_label")}
          </label>
          <input
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className="border-rule-2 bg-paper text-ink mt-1 w-full rounded-[4px] border px-3 py-2 text-[13px]"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="text-ink-2 text-[11.5px] font-semibold">
            {t("hr.settings.profile.password.confirm_label")}
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="border-rule-2 bg-paper text-ink mt-1 w-full rounded-[4px] border px-3 py-2 text-[13px]"
            autoComplete="new-password"
          />
        </div>
        {error && <p className="text-persimmon-2 text-[11.5px]">{error}</p>}
        {status === "saved" && (
          <p className="text-tez-green text-[12.5px] font-medium">
            ✓ {t("hr.settings.profile.password.saved")}
          </p>
        )}
        <div>
          <TezButton
            size="sm"
            variant="primary"
            onClick={submit}
            disabled={status === "saving" || !next || !confirm}
          >
            {t("hr.settings.profile.password.submit")}
          </TezButton>
        </div>
      </div>
    </Panel>
  );
}

// ─── Sessions ────────────────────────────────────────────────────────

function SessionsPanel() {
  const { t } = useTranslation();
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    startTransition(async () => {
      await signOutEverywhere();
    });
  };

  return (
    <Panel className="mb-4">
      <PanelHeader>
        <PanelTitle>{t("hr.settings.profile.sessions.panel_title")}</PanelTitle>
      </PanelHeader>
      <div className="flex items-center justify-between gap-3 p-[18px]">
        <div className="min-w-0">
          <div className="text-ink text-[13px] font-semibold">
            <Pill tone="success" dot>
              {t("hr.settings.profile.sessions.current_badge")}
            </Pill>
          </div>
          <p className="text-ink-4 mt-1 text-[11.5px]">
            {t("hr.settings.profile.sessions.subtitle")}
          </p>
        </div>
        <TezButton size="sm" variant="secondary" onClick={onClick} disabled={pending}>
          {pending
            ? t("hr.settings.profile.sessions.signing_out")
            : t("hr.settings.profile.sessions.sign_out_everywhere")}
        </TezButton>
      </div>
    </Panel>
  );
}

// ─── Danger zone ─────────────────────────────────────────────────────

function DangerZone({ email, soleOwner }: { email: string; soleOwner: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setStatus("deleting");
    const res = await deleteMyAccount({ confirmation: input });
    if (res.ok) return;
    setStatus("error");
    setError(t("hr.settings.profile.danger.delete_error"));
  };

  return (
    <Panel className="border-[color:var(--color-tez-red)]/30 mb-4">
      <PanelHeader>
        <PanelTitle>
          <span className="text-tez-red">{t("hr.settings.profile.danger.panel_title")}</span>
        </PanelTitle>
      </PanelHeader>
      <div className="p-[18px]">
        {soleOwner && (
          <p className="text-ink-4 mb-2 text-[12px]">
            {t("hr.settings.profile.danger.delete_sole_owner_note")}
          </p>
        )}
        <TezButton
          size="sm"
          variant="secondary"
          className="border-[color:var(--color-tez-red)]/40 text-[color:var(--color-tez-red)]"
          onClick={() => setOpen(true)}
          disabled={soleOwner}
        >
          {t("hr.settings.profile.danger.delete_button")}
        </TezButton>
      </div>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="border-rule bg-paper shadow-tez-3 w-full max-w-[440px] rounded-[6px] border p-5">
            <div className="text-ink text-[16px] font-semibold">
              {t("hr.settings.profile.danger.delete_dialog_title")}
            </div>
            <p className="text-ink-4 mt-2 text-[12.5px] leading-[1.5]">
              {t("hr.settings.profile.danger.delete_dialog_body")}
            </p>
            <p className="text-ink-3 mt-3 text-[12px]">
              {t("hr.settings.profile.danger.delete_type_hint", { email })}
            </p>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={email}
              className="border-rule-2 bg-paper text-ink mt-1.5 w-full rounded-[4px] border px-3 py-2 text-[13px]"
              style={{ fontFamily: "var(--font-tez-mono)" }}
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
                  input.trim().toLowerCase() !== email.toLowerCase()
                }
              >
                {status === "deleting"
                  ? t("hr.settings.profile.danger.delete_confirming")
                  : t("hr.settings.profile.danger.delete_confirm")}
              </TezButton>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ─── Utilities ───────────────────────────────────────────────────────

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

  // Cover-crop to 256×256
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

