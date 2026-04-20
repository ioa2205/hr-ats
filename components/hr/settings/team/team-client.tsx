"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Clock, UserPlus, UserMinus, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ru as ruLocale, enUS, uz } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  Avatar,
  Chip,
  Panel,
  PanelHeader,
  PanelTitle,
  Pill,
  Seg,
  TezButton,
} from "@/components/hr/design";
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

export function TeamClient({ selfId, selfRole, members, invites }: TeamClientProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const canManage = selfRole === "owner" || selfRole === "admin";
  const [filter, setFilter] = useState<Filter>("all");
  const [inviteBannerId, setInviteBannerId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

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
    if (m.role === "owner" || next === "owner") {
      alert(
        `${t("hr.settings.team.role_change.confirm_owner_title")}\n\n${t(
          "hr.settings.team.role_change.confirm_owner_body",
        )}`,
      );
      return;
    }
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

  const onRemove = async (userId: string) => {
    setGlobalError(null);
    const res = await fetch("/api/hr/team/remove", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    if (!res.ok) {
      setGlobalError(t("team.error_generic"));
      return;
    }
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

  const copyLink = async (inviteId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setInviteBannerId(inviteId);
      setTimeout(() => setInviteBannerId((v) => (v === inviteId ? null : v)), 1400);
    } catch {
      /* noop */
    }
  };

  return (
    <>
      {canManage && <InvitePanel />}

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <Chip
            key={f}
            active={filter === f}
            onClick={() => setFilter(f)}
            count={counts[f]}
          >
            {t(`hr.settings.team.filter.${f}` as const)}
          </Chip>
        ))}
      </div>

      {globalError && (
        <div className="text-tez-red mb-3 text-[12.5px]">{globalError}</div>
      )}

      {members.length === 1 && canManage && invites.length === 0 && filter === "all" && (
        <SoloEmptyState />
      )}

      {showInvites && invites.length > 0 && (
        <Panel className="mb-4">
          <PanelHeader>
            <PanelTitle count={invites.length}>
              {t("hr.settings.team.pending_panel")}
            </PanelTitle>
          </PanelHeader>
          <ul className="divide-rule divide-y">
            {invites.map((inv) => (
              <li
                key={inv.id}
                className="flex items-center gap-3 px-[18px] py-3"
              >
                <div className="bg-bone-2 text-ink-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-ink text-[13px]"
                    style={{ fontFamily: "var(--font-tez-mono)" }}
                  >
                    {inv.email}
                  </div>
                  <div className="text-ink-5 mt-0.5 text-[11px]">
                    {inv.invitedByName} ·{" "}
                    {formatDistanceToNow(new Date(inv.expiresAt), {
                      addSuffix: true,
                      locale: dateLocaleByLocale[locale],
                    })}
                  </div>
                </div>
                <Pill tone="neutral">{t(ROLE_LABEL[inv.role])}</Pill>
                <TezButton
                  size="sm"
                  variant="secondary"
                  leadingIcon={<Copy className="h-3 w-3" />}
                  onClick={() => void copyLink(inv.id, inv.inviteUrl)}
                >
                  {inviteBannerId === inv.id
                    ? t("hr.settings.team.copy_link_done")
                    : t("hr.settings.team.copy_link")}
                </TezButton>
                {canManage && (
                  <TezButton
                    size="sm"
                    variant="ghost"
                    aria-label={t("hr.settings.team.revoke")}
                    onClick={() => void onRevoke(inv.id)}
                  >
                    <X className="h-3 w-3" />
                  </TezButton>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {filter !== "pending" && filteredMembers.length > 0 && (
        <Panel className="mb-4">
          <PanelHeader>
            <PanelTitle count={filteredMembers.length}>
              {t("hr.settings.team.col.member")}
            </PanelTitle>
          </PanelHeader>
          <table className="w-full border-collapse text-[12.5px]">
            <thead>
              <tr className="text-ink-5 border-rule border-b text-left text-[10.5px] uppercase tracking-[0.08em]">
                <th className="px-[18px] py-2 font-semibold">
                  {t("hr.settings.team.col.member")}
                </th>
                <th className="px-[18px] py-2 font-semibold">
                  {t("hr.settings.team.col.role")}
                </th>
                <th className="px-[18px] py-2 font-semibold">
                  {t("hr.settings.team.col.joined")}
                </th>
                <th className="px-[18px] py-2 font-semibold">
                  {t("hr.settings.team.col.last_active")}
                </th>
                <th className="px-[18px] py-2" />
              </tr>
            </thead>
            <tbody>
              {filteredMembers.map((m) => (
                <tr
                  key={m.userId}
                  className="border-rule hover:bg-bone-2/40 border-b last:border-b-0"
                >
                  <td className="px-[18px] py-2.5">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.fullName} url={m.avatarUrl ?? undefined} size="md" />
                      <div className="min-w-0">
                        <div className="text-ink truncate text-[13px] font-semibold">
                          {m.fullName}
                          {m.userId === selfId && (
                            <span className="text-ink-5 ml-1 text-[11px] font-normal">
                              ({t("hr.settings.team.you")})
                            </span>
                          )}
                        </div>
                        <div
                          className="text-ink-5 truncate text-[11.5px]"
                          style={{ fontFamily: "var(--font-tez-mono)" }}
                        >
                          {m.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-[18px] py-2.5">
                    <RoleCell
                      member={m}
                      canManage={canManage}
                      selfRole={selfRole}
                      selfId={selfId}
                      onChange={(next) => void onChangeRole(m, next)}
                    />
                  </td>
                  <td className="px-[18px] py-2.5 text-ink-4">
                    <span title={new Date(m.joinedAt).toLocaleString()}>
                      {formatDistanceToNow(new Date(m.joinedAt), {
                        addSuffix: true,
                        locale: dateLocaleByLocale[locale],
                      })}
                    </span>
                  </td>
                  <td className="px-[18px] py-2.5 text-ink-4">
                    {m.lastSignInAt
                      ? formatDistanceToNow(new Date(m.lastSignInAt), {
                          addSuffix: true,
                          locale: dateLocaleByLocale[locale],
                        })
                      : t("hr.settings.team.never_active")}
                  </td>
                  <td className="px-[18px] py-2.5 text-right">
                    {canManage &&
                      m.userId !== selfId &&
                      m.role !== "owner" &&
                      !(selfRole === "admin" && m.role === "admin") && (
                        <TezButton
                          size="sm"
                          variant="ghost"
                          className="text-[color:var(--color-tez-red)]/80 hover:text-[color:var(--color-tez-red)]"
                          onClick={() => {
                            if (confirm(`${m.fullName} — ${t("team.remove")}?`)) {
                              void onRemove(m.userId);
                            }
                          }}
                          aria-label={`${t("team.remove")} ${m.fullName}`}
                          leadingIcon={<UserMinus className="h-3 w-3" />}
                        >
                          {t("team.remove")}
                        </TezButton>
                      )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}

// ─── Role change inline Seg ─────────────────────────────────────────

function RoleCell({
  member,
  canManage,
  selfRole,
  selfId,
  onChange,
}: {
  member: TeamMemberRow;
  canManage: boolean;
  selfRole: CompanyRole;
  selfId: string;
  onChange: (r: CompanyRole) => void;
}) {
  const { t } = useTranslation();

  const disabled =
    !canManage ||
    member.userId === selfId ||
    member.role === "owner" ||
    (selfRole === "admin" && member.role === "admin");

  if (disabled) {
    return <Pill tone={toneFor(member.role)}>{t(ROLE_LABEL[member.role])}</Pill>;
  }

  return (
    <Seg
      value={member.role}
      options={[
        { value: "admin", label: t("team.role_admin") },
        { value: "recruiter", label: t("team.role_recruiter") },
      ]}
      onChange={(v) => onChange(v as CompanyRole)}
    />
  );
}

function toneFor(role: CompanyRole) {
  return role === "owner" ? "persimmon" : role === "admin" ? "info" : "neutral";
}

// ─── Invite form ────────────────────────────────────────────────────

function InvitePanel() {
  const { t } = useTranslation();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyRole>("recruiter");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

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
    setEmail("");
    setStatus("sent");
    setTimeout(() => setStatus("idle"), 1800);
    router.refresh();
  };

  return (
    <Panel className="mb-4">
      <PanelHeader>
        <PanelTitle>
          <span className="inline-flex items-center gap-1.5">
            <UserPlus className="h-3.5 w-3.5" />
            {t("hr.settings.team.invite_panel")}
          </span>
        </PanelTitle>
      </PanelHeader>
      <div className="flex flex-col gap-3 p-[18px] md:flex-row md:items-end">
        <div className="min-w-0 flex-1">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("hr.settings.team.invite_email_placeholder")}
            className="border-rule-2 bg-paper text-ink w-full rounded-[4px] border px-3 py-2 text-[13px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && email.trim()) void submit();
            }}
          />
        </div>
        <Seg
          value={role}
          options={[
            { value: "admin", label: t("team.role_admin") },
            { value: "recruiter", label: t("team.role_recruiter") },
          ]}
          onChange={(v) => setRole(v as CompanyRole)}
        />
        <TezButton
          size="md"
          variant="accent"
          onClick={submit}
          disabled={status === "sending" || !email.trim()}
        >
          {status === "sending"
            ? t("hr.settings.team.invite_sending")
            : t("hr.settings.team.invite_send")}
        </TezButton>
      </div>
      {(error || status === "sent") && (
        <div className="border-rule border-t px-[18px] py-2 text-[11.5px]">
          {status === "sent" ? (
            <span className="text-tez-green font-medium">
              ✓ {t("hr.settings.team.invite_sent")}
            </span>
          ) : (
            <span className="text-persimmon-2">{error}</span>
          )}
        </div>
      )}
    </Panel>
  );
}

// ─── Solo empty state ───────────────────────────────────────────────

function SoloEmptyState() {
  const { t } = useTranslation();
  return (
    <div
      className={cn(
        "border-rule bg-bone-2/40 mb-4 flex flex-col items-start gap-2 rounded-[6px] border px-6 py-10",
      )}
    >
      <div className="text-ink text-[16px] font-semibold tracking-[-0.01em]">
        {t("hr.settings.team.empty_solo_title")}
      </div>
      <p className="text-ink-4 text-[12.5px]">
        {t("hr.settings.team.empty_solo_body")}
      </p>
      <p className="text-ink-5 mt-1 text-[11px]">
        ↑ {t("hr.settings.team.empty_solo_cta")}
      </p>
    </div>
  );
}
