"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock, Copy, UserMinus, UserPlus, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru as ruLocale, enUS, uz } from "date-fns/locale";
import {
  Avatar,
  Badge,
  Button,
  FilterChip,
  IconButton,
  Input,
  Panel,
  PanelBody,
  PanelHeader,
  PanelTitle,
  SegmentedControl,
  type BadgeTone,
} from "@/components/ui";
import { ButtonSpinner, ConfirmDialog } from "@/components/hr/settings/settings-ui";
import { useTranslation } from "@/lib/i18n/provider";
import type { CompanyRole } from "@/types";
import type { Locale, TranslationKey } from "@/lib/i18n/types";

export interface TeamMemberRow {
  userId: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: CompanyRole;
  joinedAt: string;
  lastSignInAt: string | null;
}

export interface PendingInviteRow {
  id: string;
  email: string;
  role: CompanyRole;
  token: string;
  invitedByName: string;
  expiresAt: string;
  inviteUrl: string;
}

export interface TeamClientProps {
  selfId: string;
  selfRole: CompanyRole;
  members: TeamMemberRow[];
  invites: PendingInviteRow[];
}

const FILTERS = ["all", "owners", "admins", "recruiters", "pending"] as const;
type Filter = (typeof FILTERS)[number];

const ROLE_LABEL: Record<CompanyRole, TranslationKey> = {
  owner: "team.role_owner",
  admin: "team.role_admin",
  recruiter: "team.role_recruiter",
};

const dateLocaleByLocale: Record<Locale, typeof ruLocale> = {
  ru: ruLocale,
  uz,
  en: enUS,
};

function roleTone(role: CompanyRole): BadgeTone {
  return role === "owner" ? "primary" : role === "admin" ? "info" : "neutral";
}

export function TeamClient({ selfId, selfRole, members, invites }: TeamClientProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const canManage = selfRole === "owner" || selfRole === "admin";
  const [filter, setFilter] = useState<Filter>("all");
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMemberRow | null>(null);
  const [removing, setRemoving] = useState(false);

  const counts = useMemo(
    () => ({
      all: members.length,
      owners: members.filter((m) => m.role === "owner").length,
      admins: members.filter((m) => m.role === "admin").length,
      recruiters: members.filter((m) => m.role === "recruiter").length,
      pending: invites.length,
    }),
    [members, invites],
  );

  const filteredMembers =
    filter === "all"
      ? members
      : filter === "pending"
        ? []
        : members.filter(
            (m) =>
              (filter === "owners" && m.role === "owner") ||
              (filter === "admins" && m.role === "admin") ||
              (filter === "recruiters" && m.role === "recruiter"),
          );

  const showInvites = filter === "all" || filter === "pending";

  const onChangeRole = async (m: TeamMemberRow, next: CompanyRole) => {
    if (m.userId === selfId) return;
    // Owner promotions/demotions only happen through ownership transfer.
    if (m.role === "owner" || next === "owner") return;
    setGlobalError(null);
    const res = await fetch("/api/hr/team/change-role", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_id: m.userId, role: next }),
    });
    if (!res.ok) {
      setGlobalError(t("team.error_generic"));
      return;
    }
    router.refresh();
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setGlobalError(null);
    setRemoving(true);
    const res = await fetch("/api/hr/team/remove", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_id: removeTarget.userId }),
    });
    setRemoving(false);
    if (!res.ok) {
      setGlobalError(t("team.error_generic"));
      setRemoveTarget(null);
      return;
    }
    setRemoveTarget(null);
    router.refresh();
  };

  const onRevoke = async (inviteId: string) => {
    setGlobalError(null);
    const res = await fetch("/api/hr/team/revoke-invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invite_id: inviteId }),
    });
    if (!res.ok) {
      setGlobalError(t("team.error_generic"));
      return;
    }
    router.refresh();
  };

  const canManageMember = (m: TeamMemberRow) =>
    canManage &&
    m.userId !== selfId &&
    m.role !== "owner" &&
    !(selfRole === "admin" && m.role === "admin");

  return (
    <div className="flex flex-col gap-4">
      {canManage && <InvitePanel />}

      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <FilterChip
            key={f}
            active={filter === f}
            onClick={() => setFilter(f)}
            count={counts[f]}
          >
            {t(`hr.settings.team.filter.${f}` as const)}
          </FilterChip>
        ))}
      </div>

      {globalError && (
        <p className="text-[12.5px] text-[var(--color-danger)]" role="alert">
          {globalError}
        </p>
      )}

      {members.length === 1 && canManage && invites.length === 0 && filter === "all" && (
        <SoloEmptyState />
      )}

      {showInvites && invites.length > 0 && (
        <Panel>
          <PanelHeader>
            <PanelTitle count={invites.length}>{t("hr.settings.team.pending_panel")}</PanelTitle>
          </PanelHeader>
          <ul className="divide-y divide-[var(--color-line)]">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex flex-wrap items-center gap-3 px-4 py-3"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]">
                  <Clock className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="data-mono truncate text-[13px] text-[var(--color-text)]">
                    {inv.email}
                  </div>
                  <div className="mt-0.5 text-[11px] text-[var(--color-text-subtle)]">
                    {inv.invitedByName} ·{" "}
                    {formatDistanceToNow(new Date(inv.expiresAt), {
                      addSuffix: true,
                      locale: dateLocaleByLocale[locale],
                    })}
                  </div>
                </div>
                <Badge tone={roleTone(inv.role)} className="capitalize">
                  {t(ROLE_LABEL[inv.role])}
                </Badge>
                <CopyLinkButton url={inv.inviteUrl} />
                {canManage && (
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label={t("hr.settings.team.revoke_invite_for", { email: inv.email })}
                    onClick={() => void onRevoke(inv.id)}
                  >
                    <X className="h-4 w-4" />
                  </IconButton>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {filter !== "pending" && filteredMembers.length > 0 && (
        <Panel>
          <PanelHeader>
            <PanelTitle count={filteredMembers.length}>
              {t("hr.settings.team.col.member")}
            </PanelTitle>
          </PanelHeader>

          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-left text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-text-subtle)]">
                  <th className="px-4 py-2 font-semibold">{t("hr.settings.team.col.member")}</th>
                  <th className="px-4 py-2 font-semibold">{t("hr.settings.team.col.role")}</th>
                  <th className="px-4 py-2 font-semibold">{t("hr.settings.team.col.joined")}</th>
                  <th className="px-4 py-2 font-semibold">
                    {t("hr.settings.team.col.last_active")}
                  </th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => (
                  <tr
                    key={m.userId}
                    className="border-b border-[var(--color-line)] last:border-b-0 hover:bg-[var(--color-surface-subtle)]"
                  >
                    <td className="px-4 py-2.5">
                      <MemberIdentity m={m} isSelf={m.userId === selfId} />
                    </td>
                    <td className="px-4 py-2.5">
                      <RoleCell
                        member={m}
                        editable={canManageMember(m)}
                        onChange={(next) => void onChangeRole(m, next)}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                      <span title={new Date(m.joinedAt).toLocaleString()}>
                        {formatDistanceToNow(new Date(m.joinedAt), {
                          addSuffix: true,
                          locale: dateLocaleByLocale[locale],
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--color-text-muted)]">
                      {m.lastSignInAt
                        ? formatDistanceToNow(new Date(m.lastSignInAt), {
                            addSuffix: true,
                            locale: dateLocaleByLocale[locale],
                          })
                        : t("hr.settings.team.never_active")}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {canManageMember(m) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[var(--color-danger)]"
                          onClick={() => setRemoveTarget(m)}
                          aria-label={`${t("team.remove")} ${m.fullName}`}
                        >
                          <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                          {t("team.remove")}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="divide-y divide-[var(--color-line)] md:hidden">
            {filteredMembers.map((m) => (
              <li key={m.userId} className="flex flex-col gap-3 px-4 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <MemberIdentity m={m} isSelf={m.userId === selfId} />
                  <RoleCell
                    member={m}
                    editable={canManageMember(m)}
                    onChange={(next) => void onChangeRole(m, next)}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 text-[11.5px] text-[var(--color-text-subtle)]">
                  <span>
                    {t("hr.settings.team.col.joined")}:{" "}
                    {formatDistanceToNow(new Date(m.joinedAt), {
                      addSuffix: true,
                      locale: dateLocaleByLocale[locale],
                    })}
                  </span>
                  {canManageMember(m) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[var(--color-danger)]"
                      onClick={() => setRemoveTarget(m)}
                      aria-label={`${t("team.remove")} ${m.fullName}`}
                    >
                      <UserMinus className="h-3.5 w-3.5" aria-hidden="true" />
                      {t("team.remove")}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(v) => {
          if (!v) setRemoveTarget(null);
        }}
        title={t("hr.settings.team.remove_dialog_title")}
        description={
          removeTarget
            ? t("hr.settings.team.remove_dialog_body", { name: removeTarget.fullName })
            : undefined
        }
        confirmLabel={t("team.remove")}
        cancelLabel={t("common.cancel")}
        onConfirm={confirmRemove}
        busy={removing}
      />
    </div>
  );
}

function MemberIdentity({ m, isSelf }: { m: TeamMemberRow; isSelf: boolean }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={m.fullName} src={m.avatarUrl} size="md" />
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-[var(--color-text)]">
          {m.fullName}
          {isSelf && (
            <span className="ml-1 text-[11px] font-normal text-[var(--color-text-subtle)]">
              ({t("hr.settings.team.you")})
            </span>
          )}
        </div>
        <div className="data-mono truncate text-[11.5px] text-[var(--color-text-subtle)]">
          {m.email}
        </div>
      </div>
    </div>
  );
}

// ─── Role change inline control ─────────────────────────────────────

function RoleCell({
  member,
  editable,
  onChange,
}: {
  member: TeamMemberRow;
  editable: boolean;
  onChange: (r: CompanyRole) => void;
}) {
  const { t } = useTranslation();

  if (!editable) {
    return (
      <Badge tone={roleTone(member.role)} className="capitalize">
        {t(ROLE_LABEL[member.role])}
      </Badge>
    );
  }

  return (
    <SegmentedControl
      size="sm"
      aria-label={t("hr.settings.team.col.role")}
      value={member.role as "admin" | "recruiter"}
      options={[
        { value: "admin", label: t("team.role_admin") },
        { value: "recruiter", label: t("team.role_recruiter") },
      ]}
      onChange={(v) => onChange(v as CompanyRole)}
    />
  );
}

function CopyLinkButton({ url }: { url: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          /* noop */
        }
      }}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {copied ? t("hr.settings.team.copy_link_done") : t("hr.settings.team.copy_link")}
    </Button>
  );
}

// ─── Invite form ────────────────────────────────────────────────────

function InvitePanel() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>("recruiter");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; url: string } | null>(null);

  const submit = async () => {
    setError(null);
    setStatus("sending");
    const res = await fetch("/api/hr/team/invite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setStatus("error");
      setError(
        data.error === "already_member"
          ? t("hr.settings.team.invite_already_member")
          : t("hr.settings.team.invite_error"),
      );
      return;
    }
    const data = (await res.json().catch(() => ({}))) as { invite_url?: string };
    setSent({ email: email.trim(), url: data.invite_url ?? "" });
    setEmail("");
    setStatus("idle");
    router.refresh();
  };

  return (
    <Panel>
      <PanelHeader>
        <PanelTitle>
          <span className="inline-flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" aria-hidden="true" />
            {t("hr.settings.team.invite_panel")}
          </span>
        </PanelTitle>
      </PanelHeader>
      <PanelBody className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="min-w-0 flex-1">
            <Input
              label={t("auth.email")}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("hr.settings.team.invite_email_placeholder")}
              inputSize="lg"
              onKeyDown={(e) => {
                if (e.key === "Enter" && email.trim()) void submit();
              }}
            />
          </div>
          <SegmentedControl
            aria-label={t("hr.settings.team.col.role")}
            value={role as "admin" | "recruiter"}
            options={[
              { value: "admin", label: t("team.role_admin") },
              { value: "recruiter", label: t("team.role_recruiter") },
            ]}
            onChange={(v) => setRole(v as CompanyRole)}
          />
          <Button
            variant="primary"
            onClick={submit}
            disabled={status === "sending" || !email.trim()}
          >
            {status === "sending" && <ButtonSpinner />}
            {status === "sending"
              ? t("hr.settings.team.invite_sending")
              : t("hr.settings.team.invite_send")}
          </Button>
        </div>

        {error && <p className="text-[12px] text-[var(--color-danger)]">{error}</p>}

        {sent && (
          <div className="flex flex-col gap-2 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--color-success)_35%,transparent)] bg-[var(--color-success-container)] px-3.5 py-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-[12.5px] font-medium text-[var(--color-on-success-container)]">
                {t("hr.settings.team.invite_sent_to", { email: sent.email })}
              </p>
              <button
                type="button"
                onClick={() => setSent(null)}
                aria-label={t("common.cancel")}
                className="shrink-0 text-[var(--color-on-success-container)] opacity-70 hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {sent.url && (
              <div className="flex items-center gap-2">
                <code className="data-mono min-w-0 flex-1 truncate rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2 py-1 text-[11px] text-[var(--color-text-muted)]">
                  {sent.url}
                </code>
                <CopyLinkButton url={sent.url} />
              </div>
            )}
          </div>
        )}
      </PanelBody>
    </Panel>
  );
}

// ─── Solo empty state ───────────────────────────────────────────────

function SoloEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-6 py-10">
      <div className="text-[16px] font-semibold tracking-[-0.01em] text-[var(--color-text)]">
        {t("hr.settings.team.empty_solo_title")}
      </div>
      <p className="text-[12.5px] text-[var(--color-text-muted)]">
        {t("hr.settings.team.empty_solo_body")}
      </p>
      <p className="mt-1 text-[11px] text-[var(--color-text-subtle)]">
        ↑ {t("hr.settings.team.empty_solo_cta")}
      </p>
    </div>
  );
}
