"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, UserPlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui";
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
  error_invite_email_mismatch: string;
  error_already_member: string;
  error_accept_failed: string;
}

interface OnboardingDecisionProps {
  labels: OnboardingLabels;
  intent?: "pro";
}

export function OnboardingDecision({ labels, intent }: OnboardingDecisionProps) {
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
          invite_email_mismatch: labels.error_invite_email_mismatch,
          already_member: labels.error_already_member,
        };
        setError(knownErrors[errorKey] ?? labels.error_accept_failed);
        return;
      }

      router.push(intent === "pro" ? "/hr/settings/billing?intent=pro" : "/hr/dashboard");
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
        onClick={() =>
          router.push(intent === "pro" ? "/onboarding/create?intent=pro" : "/onboarding/create")
        }
        className="group hover:shadow-level-1 flex items-center gap-4 rounded-[16px] border border-[var(--color-primary)] bg-[var(--color-primary-container)] px-5 py-4 text-left transition-all outline-none hover:-translate-y-px focus-visible:border-[var(--color-focus)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-primary)] text-[var(--color-on-primary)]">
          <Building2 className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-[var(--color-text)]">
            {labels.create_company}
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-[1.45] text-[var(--color-text-muted)]">
            {labels.create_company_desc}
          </span>
        </span>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-[var(--color-text-subtle)] transition-colors group-hover:text-[var(--color-text)]"
          aria-hidden="true"
        />
      </button>

      <AuthDivider label={labels.or} />

      {/* Join via invite — secondary path */}
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void handleJoin();
        }}
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface-subtle)] text-[var(--color-text-muted)]">
            <UserPlus className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-[var(--color-text)]">
              {labels.join_company}
            </p>
            <p className="mt-0.5 text-[12.5px] leading-[1.45] text-[var(--color-text-muted)]">
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
          name="invite_token"
          autoComplete="off"
        />
        {error && <AuthBanner tone="error">{error}</AuthBanner>}

        <Button
          type="submit"
          variant="secondary"
          size="lg"
          fullWidth
          disabled={joining || !token.trim()}
        >
          {joining && (
            <Loader2
              className="h-4 w-4 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
          {joining ? labels.joining : labels.join}
        </Button>
      </form>
    </div>
  );
}
