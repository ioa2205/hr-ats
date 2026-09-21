"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthBanner } from "@/components/auth/auth-banner";
import { useTranslation } from "@/lib/i18n/provider";
import type { TranslationKey } from "@/lib/i18n/types";
import type { CompanyRole } from "@/types";

interface AcceptInviteClientProps {
  token: string;
  companyName: string;
  role: CompanyRole;
  email: string;
}

const roleKey: Record<CompanyRole, TranslationKey> = {
  owner: "team.role_owner",
  admin: "team.role_admin",
  recruiter: "team.role_recruiter",
};

const errorKeys: Record<string, TranslationKey> = {
  already_member: "invite.error_already_member",
  invite_expired: "invite.error_expired",
  invite_used: "invite.error_used",
  invite_email_mismatch: "invite.error_email_mismatch",
};

export function AcceptInviteClient({ token, companyName, role, email }: AcceptInviteClientProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [accepting, startAccepting] = useTransition();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/onboarding/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(
          data.error && errorKeys[data.error]
            ? t(errorKeys[data.error])
            : t("invite.error_generic"),
        );
        return;
      }

      startAccepting(() => {
        router.push("/hr/dashboard");
      });
    } catch {
      setError(t("invite.error_generic"));
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || accepting;

  return (
    <AuthPanel
      eyebrow={t("onboarding.welcome_eyebrow")}
      title={t("invite.join_heading", { name: companyName })}
    >
      {/* Company card */}
      <div className="flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-[14px] font-bold text-[var(--color-on-primary)]">
          {companyName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-[var(--color-text)]">
            {companyName}
          </p>
          <p className="data-mono mt-0.5 text-[10.5px] font-semibold tracking-[0.12em] text-[var(--color-text-muted)] uppercase">
            <Building2 className="mr-1 inline h-3 w-3 align-[-1px]" aria-hidden="true" />
            {t("invite.invited_as")} · {t(roleKey[role])}
          </p>
        </div>
      </div>

      {/* Email line */}
      <p className="data-mono text-[12px] text-[var(--color-text-muted)]">
        {t("invite.sent_to")} {email}
      </p>

      {error && <AuthBanner tone="error">{error}</AuthBanner>}

      <Button type="button" size="lg" fullWidth onClick={() => void handleAccept()} disabled={busy}>
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <UserPlus className="h-4 w-4" aria-hidden="true" />
        )}
        {busy ? t("invite.accepting") : t("invite.accept")}
      </Button>
    </AuthPanel>
  );
}
