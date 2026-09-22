"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, ArrowRight } from "lucide-react";
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
        className="group flex items-center gap-4 rounded-[16px] bg-[var(--color-primary-container)] px-5 py-5 text-left transition-colors hover:bg-[var(--color-surface-strong)]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center text-[var(--color-on-primary-container)]">
          <Building2 className="h-7 w-7" strokeWidth={1.5} aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[17px] font-semibold text-[var(--color-text)]">
            {labels.create_company}
          </span>
          <span className="mt-1 block text-[14px] leading-[1.5] text-[var(--color-text-muted)]">
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
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold text-[var(--color-text)]">
              {labels.join_company}
            </h2>
            <p className="mt-1 text-[14px] leading-[1.5] text-[var(--color-text-muted)]">
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
          variant="tonal"
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
