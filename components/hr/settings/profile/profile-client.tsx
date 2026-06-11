"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Badge,
  Button,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  SegmentedControl,
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
    <div className="flex flex-col gap-4">
      <IdentityCard user={user} avatarUrl={avatarUrl} setAvatarUrl={setAvatarUrl} />

      <Panel>
        <PanelHeader>
          <PanelTitle>{t("hr.settings.profile.name.label")}</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <NameField initial={user.fullName} />
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader>
          <PanelTitle>{t("profile.language_label")}</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <LocaleField initial={user.locale} refresh={() => router.refresh()} />
        </PanelBody>
      </Panel>

      <EmailPanel currentEmail={user.email} />
      <PasswordPanel
        passwordAuthEnabled={user.passwordAuthEnabled}
        authProviderLabel={user.authProviderLabel}
      />
      <SessionsPanel />
      <DangerZone email={user.email} soleOwner={user.isSoleOwner} />
    </div>
  );
}

// ─── Identity + avatar ───────────────────────────────────────────────

function IdentityCard({
  user,
  avatarUrl,
  setAvatarUrl,
}: {
  user: ProfileClientProps["user"];
  avatarUrl: string | null;
  setAvatarUrl: (v: string | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <Panel>
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={user.fullName} src={avatarUrl} size="xl" />
          <div className="min-w-0">
            <div className="truncate text-[18px] font-semibold tracking-[-0.015em] text-[var(--color-text)]">
              {user.fullName}
            </div>
            <div className="data-mono mt-0.5 truncate text-[12.5px] text-[var(--color-text-muted)]">
              {user.email}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="primary" className="capitalize">
                {t(ROLE_LABEL[user.role])}
              </Badge>
              <Badge tone="neutral">{user.locale.toUpperCase()}</Badge>
            </div>
          </div>
        </div>
        <div className="shrink-0">
          <AvatarUploader
            name={user.fullName}
            url={avatarUrl}
            onUrl={setAvatarUrl}
            endpoint="/api/profile/avatar"
            fieldName="avatar"
            responseKey="avatar_url"
            maxBytes={2 * 1024 * 1024}
            labels={{
              change: t("hr.settings.profile.identity.change_avatar"),
              remove: t("hr.settings.profile.identity.remove_avatar"),
              hint: t("hr.settings.profile.avatar.hint"),
              badType: t("hr.settings.profile.avatar.bad_type"),
              tooLarge: t("hr.settings.profile.avatar.too_large"),
              uploadFailed: t("hr.settings.profile.avatar.upload_failed"),
            }}
          />
        </div>
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
    <div className="max-w-[420px]">
      <Input
        aria-label={t("hr.settings.profile.name.label")}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => void save(e.target.value)}
        maxLength={200}
      />
      <div className="mt-1">
        <SaveStatusLine
          status={status === "error" ? "error" : status}
          savedLabel={t("profile.saved")}
          errorLabel={t("hr.settings.profile.name.too_short")}
        />
      </div>
    </div>
  );
}

// ─── Locale segmented control ────────────────────────────────────────

function LocaleField({ initial, refresh }: { initial: Locale; refresh: () => void }) {
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
    <div>
      <SegmentedControl
        aria-label={t("profile.language_label")}
        value={value}
        options={[
          { value: "ru", label: "Русский" },
          { value: "uz", label: "O‘zbekcha" },
          { value: "en", label: "English" },
        ]}
        onChange={(v) => onChange(v as Locale)}
      />
      {pending && (
        <div className="mt-1 text-[11.5px] text-[var(--color-text-subtle)]">{t("common.saving")}</div>
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
    <Panel>
      <PanelHeader>
        <PanelTitle>{t("hr.settings.profile.email.panel_title")}</PanelTitle>
      </PanelHeader>
      <PanelBody>
        <div className="data-mono text-[11px] uppercase tracking-[0.06em] text-[var(--color-text-muted)]">
          {t("hr.settings.profile.email.current_label")}
        </div>
        <div className="data-mono mt-1 text-[13px] text-[var(--color-text)]">{currentEmail}</div>

        {!open ? (
          <Button className="mt-3" size="sm" variant="secondary" onClick={() => setOpen(true)}>
            {t("hr.settings.profile.email.change_button")}
          </Button>
        ) : status === "sent" ? (
          <p className="mt-3 text-[12.5px] font-medium text-[var(--color-success)]">
            ✓ {t("hr.settings.profile.email.sent")}
          </p>
        ) : (
          <div className="mt-3 max-w-[420px] space-y-2">
            <Input
              type="email"
              label={t("hr.settings.profile.email.new_label")}
              value={next}
              onChange={(e) => setNext(e.target.value)}
              helperText={t("hr.settings.profile.email.hint")}
              error={error ?? undefined}
              inputSize="lg"
            />
            <div className="flex gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={status === "sending"}>
                {t("common.cancel")}
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={submit}
                disabled={status === "sending" || next.trim().length < 4}
              >
                {status === "sending" && <ButtonSpinner />}
                {t("hr.settings.profile.email.submit")}
              </Button>
            </div>
          </div>
        )}
      </PanelBody>
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
      <Panel>
        <PanelHeader>
          <PanelTitle>{t("hr.settings.profile.password.panel_title")}</PanelTitle>
        </PanelHeader>
        <PanelBody>
          <p className="text-[12.5px] text-[var(--color-text-muted)]">{t(key)}</p>
        </PanelBody>
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
    <Panel>
      <PanelHeader>
        <PanelTitle>{t("hr.settings.profile.password.panel_title")}</PanelTitle>
      </PanelHeader>
      <PanelBody>
        <div className="grid max-w-[440px] gap-3">
          <Input
            type="password"
            label={t("hr.settings.profile.password.new_label")}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            inputSize="lg"
          />
          <Input
            type="password"
            label={t("hr.settings.profile.password.confirm_label")}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            error={error ?? undefined}
            inputSize="lg"
          />
          {status === "saved" && (
            <p className="text-[12.5px] font-medium text-[var(--color-success)]">
              ✓ {t("hr.settings.profile.password.saved")}
            </p>
          )}
          <div>
            <Button
              size="sm"
              variant="primary"
              onClick={submit}
              disabled={status === "saving" || !next || !confirm}
            >
              {status === "saving" && <ButtonSpinner />}
              {t("hr.settings.profile.password.submit")}
            </Button>
          </div>
        </div>
      </PanelBody>
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
    <Panel>
      <PanelHeader>
        <PanelTitle>{t("hr.settings.profile.sessions.panel_title")}</PanelTitle>
      </PanelHeader>
      <PanelBody>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Badge tone="success" variant="dot">
              {t("hr.settings.profile.sessions.current_badge")}
            </Badge>
            <p className="mt-1 text-[11.5px] text-[var(--color-text-muted)]">
              {t("hr.settings.profile.sessions.subtitle")}
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={onClick} disabled={pending}>
            {pending && <ButtonSpinner />}
            {pending
              ? t("hr.settings.profile.sessions.signing_out")
              : t("hr.settings.profile.sessions.sign_out_everywhere")}
          </Button>
        </div>
      </PanelBody>
    </Panel>
  );
}

// ─── Danger zone ─────────────────────────────────────────────────────

function DangerZone({ email, soleOwner }: { email: string; soleOwner: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "deleting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setStatus("deleting");
    const res = await deleteMyAccount({ confirmation: email });
    if (res.ok) return;
    setStatus("error");
    setError(t("hr.settings.profile.danger.delete_error"));
  };

  return (
    <Panel className="border-[color-mix(in_srgb,var(--color-danger)_40%,var(--color-line))]">
      <PanelHeader>
        <PanelTitle className="text-[var(--color-danger)]">
          {t("hr.settings.profile.danger.panel_title")}
        </PanelTitle>
      </PanelHeader>
      <PanelBody>
        {soleOwner && (
          <p className="mb-2 text-[12px] text-[var(--color-text-muted)]">
            {t("hr.settings.profile.danger.delete_sole_owner_note")}
          </p>
        )}
        <Button
          size="sm"
          variant="secondary"
          className="border-[color-mix(in_srgb,var(--color-danger)_50%,var(--color-line))] text-[var(--color-danger)]"
          onClick={() => {
            setError(null);
            setStatus("idle");
            setOpen(true);
          }}
          disabled={soleOwner}
        >
          {t("hr.settings.profile.danger.delete_button")}
        </Button>
      </PanelBody>

      <ConfirmDialog
        open={open}
        onOpenChange={(v) => setOpen(v)}
        title={t("hr.settings.profile.danger.delete_dialog_title")}
        description={t("hr.settings.profile.danger.delete_dialog_body")}
        confirmLabel={t("hr.settings.profile.danger.delete_confirm")}
        confirmingLabel={t("hr.settings.profile.danger.delete_confirming")}
        cancelLabel={t("common.cancel")}
        onConfirm={submit}
        busy={status === "deleting"}
        error={error}
        typeToConfirm={email}
        typeToConfirmLabel={t("hr.settings.profile.danger.delete_dialog_title")}
        typeToConfirmHint={t("hr.settings.profile.danger.delete_type_hint", { email })}
      />
    </Panel>
  );
}
