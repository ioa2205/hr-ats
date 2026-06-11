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

/**
 * Company switcher for the redesigned HR sidebar. Uses semantic role tokens and
 * matches the 22×22 org-mark spec.
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
    <div className="flex w-full items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--color-line)] bg-[var(--color-surface)] px-2.5 py-2 text-left transition-colors hover:bg-[var(--color-surface-subtle)] disabled:opacity-60">
      {currentCompany.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentCompany.logo_url}
          alt=""
          className="h-[22px] w-[22px] shrink-0 rounded-[var(--radius-sm)] object-cover"
        />
      ) : (
        <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-[var(--radius-sm)] bg-[var(--color-text)] text-[11px] font-semibold leading-none text-[var(--color-surface)]">
          {currentCompany.name.slice(0, 1).toUpperCase() || <Building2 className="h-3 w-3" />}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[12.5px] font-semibold tracking-[-0.005em] text-[var(--color-text)]">
          {currentCompany.name}
        </span>
        <span className="truncate text-[10.5px] capitalize text-[var(--color-text-muted)]">
          {currentCompany.role}
        </span>
      </div>
      {hasMultiple && (
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-subtle)]" />
      )}
    </div>
  );

  if (!hasMultiple) return tile;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger disabled={pending} className="w-full" aria-label="Switch company">
          {tile}
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
                  <p className="truncate text-sm">{c.name}</p>
                  <p className="truncate text-xs capitalize text-[var(--color-text-muted)]">
                    {c.role}
                  </p>
                </div>
                {isCurrent && <Check className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p className="mt-1 px-1 text-[10.5px] text-[var(--color-danger)]">
          Could not switch — try again.
        </p>
      )}
    </>
  );
}
