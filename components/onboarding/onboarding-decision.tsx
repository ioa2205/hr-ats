"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, UserPlus, ArrowRight } from "lucide-react";
import { TezButton } from "@/components/hr/design";
import { AuthField } from "@/components/auth/auth-field";
import { AuthBanner, AuthDivider } from "@/components/auth/auth-banner";

export interface OnboardingLabels {
  create_company: string;
  create_company_desc: string;
  join_company: string;
  join_company_desc: string;
  invite_token: string;
  invite_token_hint: string;
  join: string;
  joining: string;
  or: string;
  error_invite_invalid: string;
  error_invite_expired: string;
  error_invite_used: string;
  error_already_member: string;
  error_accept_failed: string;
}

interface OnboardingDecisionProps {
  labels: OnboardingLabels;
}

export function OnboardingDecision({ labels }: OnboardingDecisionProps) {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    const trimmed = token.trim();
    if (!trimmed) return;

    setJoining(true);
    setError(null);

    try {
      const res = await fetch("/api/onboarding/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: trimmed }),
      });

      const body = await res.json();

      if (!res.ok) {
        const errorKey = body.error as string;
        const knownErrors: Record<string, string> = {
          invite_not_found: labels.error_invite_invalid,
          invite_expired: labels.error_invite_expired,
          invite_used: labels.error_invite_used,
          already_member: labels.error_already_member,
        };
        setError(knownErrors[errorKey] ?? labels.error_accept_failed);
        return;
      }

      router.push("/hr/dashboard");
      router.refresh();
    } catch {
      setError(labels.error_accept_failed);
    } finally {
      setJoining(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Create Company — primary path */}
      <button
        type="button"
        onClick={() => router.push("/onboarding/create")}
        className="border-rule bg-paper hover:border-ink-6 hover:bg-bone-2/60 group flex items-center gap-3 rounded-[6px] border px-4 py-3.5 text-left transition-colors"
      >
        <span className="bg-ink text-paper flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px]">
          <Building2 className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="text-ink block text-[14px] font-semibold">
            {labels.create_company}
          </span>
          <span className="text-ink-4 mt-0.5 block text-[12.5px] leading-[1.45]">
            {labels.create_company_desc}
          </span>
        </span>
        <ArrowRight className="text-ink-5 group-hover:text-ink h-4 w-4 shrink-0 transition-colors" />
      </button>

      <AuthDivider label={labels.or} />

      {/* Join via invite — secondary path */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <span className="border-rule bg-bone-2 text-ink-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] border">
            <UserPlus className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-ink text-[14px] font-semibold">{labels.join_company}</p>
            <p className="text-ink-4 mt-0.5 text-[12.5px] leading-[1.45]">
              {labels.join_company_desc}
            </p>
          </div>
        </div>

        <AuthField
          label={labels.invite_token}
          placeholder={labels.invite_token_hint}
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleJoin();
            }
          }}
          autoComplete="off"
        />
        {error && <AuthBanner tone="error">{error}</AuthBanner>}

        <TezButton
          type="button"
          variant="secondary"
          size="lg"
          onClick={handleJoin}
          disabled={joining || !token.trim()}
          className="h-11 w-full justify-center text-[13.5px] font-semibold"
          leadingIcon={joining ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
        >
          {joining ? labels.joining : labels.join}
        </TezButton>
      </div>
    </div>
  );
}
