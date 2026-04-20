"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui";
import { cn } from "@/lib/utils";

export interface CompanyOption {
  id: string;
  name: string;
  logo_url: string | null;
  role: string;
}

interface CompanySwitcherProps {
  currentCompany: CompanyOption;
  companies: CompanyOption[];
}

function Avatar({ option, size }: { option: CompanyOption; size: 6 | 8 }) {
  if (option.logo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={option.logo_url}
        alt=""
        className={cn(
          "shrink-0 rounded-[var(--radius-sm)] object-cover",
          size === 8 ? "h-8 w-8" : "h-6 w-6",
        )}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-primary-container text-on-primary-container flex shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-xs font-semibold",
        size === 8 ? "h-8 w-8" : "h-6 w-6",
      )}
    >
      {option.name.slice(0, 1).toUpperCase() || <Building2 className="h-4 w-4" />}
    </div>
  );
}

export function CompanySwitcher({ currentCompany, companies }: CompanySwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const hasMultiple = companies.length > 1;

  async function switchTo(companyId: string) {
    if (companyId === currentCompany.id) return;
    setError(null);
    const res = await fetch("/api/company/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId }),
    });
    if (!res.ok) {
      setError("switch_failed");
      return;
    }
    startTransition(() => {
      router.refresh();
      router.push("/hr/dashboard");
    });
  }

  if (!hasMultiple) {
    return (
      <div className="border-outline-variant mx-3 mt-2 mb-1 flex items-center gap-2 rounded-[var(--radius-md)] border px-2 py-2">
        <Avatar option={currentCompany} size={8} />
        <div className="min-w-0 flex-1">
          <p className="text-on-surface truncate text-sm font-medium" title={currentCompany.name}>
            {currentCompany.name}
          </p>
          <p className="text-on-surface-variant truncate text-xs capitalize">
            {currentCompany.role}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3 mt-2 mb-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={pending}
          className="border-outline-variant hover:bg-surface-container flex w-full items-center gap-2 rounded-[var(--radius-md)] border px-2 py-2 text-left transition-colors disabled:opacity-60"
          aria-label="Switch company"
        >
          <Avatar option={currentCompany} size={8} />
          <div className="min-w-0 flex-1">
            <p className="text-on-surface truncate text-sm font-medium" title={currentCompany.name}>
              {currentCompany.name}
            </p>
            <p className="text-on-surface-variant truncate text-xs capitalize">
              {currentCompany.role}
            </p>
          </div>
          <ChevronDown className="text-on-surface-variant h-4 w-4 shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[240px]">
          <DropdownMenuLabel>Switch company</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {companies.map((c) => {
            const isCurrent = c.id === currentCompany.id;
            return (
              <DropdownMenuItem
                key={c.id}
                onSelect={(e) => {
                  e.preventDefault();
                  void switchTo(c.id);
                }}
                className="flex items-center gap-2"
              >
                <Avatar option={c} size={6} />
                <div className="min-w-0 flex-1">
                  <p className="text-on-surface truncate text-sm">{c.name}</p>
                  <p className="text-on-surface-variant truncate text-xs capitalize">{c.role}</p>
                </div>
                {isCurrent && <Check className="text-primary h-4 w-4 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && <p className="text-danger mt-1 px-1 text-xs">Could not switch — try again.</p>}
    </div>
  );
}

/**
 * TezHR-styled variant of the switcher for use inside the redesigned HR sidebar.
 * Uses the bone/ink/rule design tokens and matches the 22×22 org-mark spec.
 */
export function CompanySwitcherMenu({
  currentCompany,
  companies,
}: CompanySwitcherProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const hasMultiple = companies.length > 1;

  async function switchTo(companyId: string) {
    if (companyId === currentCompany.id) return;
    setError(null);
    const res = await fetch("/api/company/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_id: companyId }),
    });
    if (!res.ok) {
      setError("switch_failed");
      return;
    }
    startTransition(() => {
      router.refresh();
      router.push("/hr/dashboard");
    });
  }

  const tile = (
    <div className="border-rule bg-bone hover:bg-bone-2 flex w-full items-center gap-2.5 rounded-[4px] border px-2.5 py-2 text-left transition-colors disabled:opacity-60">
      {currentCompany.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentCompany.logo_url}
          alt=""
          className="h-[22px] w-[22px] shrink-0 rounded-[4px] object-cover"
        />
      ) : (
        <span className="bg-ink text-paper grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[4px] text-[11px] font-semibold leading-none">
          {currentCompany.name.slice(0, 1).toUpperCase() || <Building2 className="h-3 w-3" />}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[12px] font-semibold tracking-[-0.005em]">
          {currentCompany.name}
        </span>
        <span className="text-ink-4 truncate text-[10.5px] capitalize">
          {currentCompany.role}
        </span>
      </div>
      <ChevronDown className="text-ink-5 h-3.5 w-3.5 shrink-0" />
    </div>
  );

  if (!hasMultiple) return tile;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger disabled={pending} className="w-full" aria-label="Switch company">
          {tile}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[220px]">
          <DropdownMenuLabel>Switch company</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {companies.map((c) => {
            const isCurrent = c.id === currentCompany.id;
            return (
              <DropdownMenuItem
                key={c.id}
                onSelect={(e) => {
                  e.preventDefault();
                  void switchTo(c.id);
                }}
                className="flex items-center gap-2"
              >
                <Avatar option={c} size={6} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{c.name}</p>
                  <p className="text-ink-4 truncate text-xs capitalize">{c.role}</p>
                </div>
                {isCurrent && <Check className="text-ink h-4 w-4 shrink-0" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p className="mt-1 px-1 text-[10.5px]" style={{ color: "var(--color-tez-red)" }}>
          Could not switch — try again.
        </p>
      )}
    </>
  );
}
