"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, UserPlus } from "lucide-react";
import { TezButton } from "@/components/hr/design";
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
          data.error && errorKeys[data.error] ? t(errorKeys[data.error]) : t("invite.error_generic"),
        );
        return;
      }

      startAccepting(() => {
        router.push("/hr/dashboard");
      });
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
      <div className="border-rule bg-bone-2/60 flex items-center gap-3 rounded-[6px] border px-4 py-3">
        <span className="bg-ink text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] text-[14px] font-bold">
          {companyName.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-ink truncate text-[14px] font-semibold">{companyName}</p>
          <p
            className="text-ink-4 mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em]"
            style={{ fontFamily: "var(--font-tez-mono)" }}
          >
            <Building2 className="mr-1 inline h-3 w-3 align-[-1px]" />
            {t("invite.invited_as")} · {t(roleKey[role])}
          </p>
        </div>
      </div>

      {/* Email line */}
      <p
        className="text-ink-4 text-[12px]"
        style={{ fontFamily: "var(--font-tez-mono)" }}
      >
        {t("invite.sent_to")} {email}
      </p>

      {error && <AuthBanner tone="error">{error}</AuthBanner>}

      <TezButton
        type="button"
        variant="primary"
        size="lg"
        onClick={() => void handleAccept()}
        disabled={busy}
        leadingIcon={
          busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />
        }
        className="h-12 w-full justify-center text-[14.5px] font-semibold"
      >
        {busy ? t("invite.accepting") : t("invite.accept")}
      </TezButton>
    </AuthPanel>
  );
}
